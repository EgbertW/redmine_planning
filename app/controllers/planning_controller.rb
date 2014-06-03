# Copyright 2014 Egbert van der Wal <egbert@assistobot.com>
#
# This file is part of redmine_planning
#
# redmine_planning is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# redmine_planning is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with redmine_planning. If not see <http://www.gnu.org/licenses/>.

require 'json'

class PlanningController < ApplicationController
  unloadable

  menu_item :planning
  before_filter :find_optional_project, :except => [:create_relation]
  rescue_from Query::StatementInvalid, :with => :query_statement_invalid

  before_filter :find_issue, :authorize, :only => [:create_relation]

  helper :issues
  helper :projects
  helper :queries
  include QueriesHelper

  def show
    Redmine::Plugin.mirror_assets(:redmine_planning)
    retrieve_query
    @query.group_by = nil
  end

  def save
    issue_list = []
    Issue.transaction do
      params[:issues].each do |k, update|
          issue = Issue.find(update[:id])
          issue[:start_date] = Date.parse(update[:start_date])
          issue[:due_date] = Date.parse(update[:due_date])
          issue.save!
          issue_list.push(issue)
      end
    end
    
    # Give feedback, as no errors doesn't indicate nothing changed
    response = {} 
    issue_list.each do |issue|
      # It seems that when you save an issue, the state of the object may not be
      # equal to that in the database, due to validation correction. Especially
      # for parent tasks, a reload is needed.
      issue.reload
      response[issue.id] = {:start_date => issue.start_date, :due_date => issue.due_date}
      
      # Add all parents as they might've been updated as well
      parent = issue.parent
      while not parent.nil? do
        response[parent.id] = {:start_date => parent.start_date, :due_date => parent.due_date}
        parent = parent.parent
      end
    end

    respond_to do |format|
      format.json { render :json => response }
    end
  end

  def add_issue(issue)
    return if @issue_ids.include?(issue[:id])
    prj = @project_ids[issue[:project_id]]
    tracker = @tracker_ids[issue.tracker_id]
    @issue_ids.add(issue[:id])
    @response[:issues].push({
        :id => issue[:id],
        :start_date => issue[:start_date],
        :due_date => issue[:due_date],
        :project_id => issue[:project_id],
        :project_identifier => prj[:identifier],
        :project_name => prj[:name],
        :tracker => tracker,
        :name => issue[:subject],
        :description => issue[:description],
        :leaf => issue.leaf?,
        :parent => issue.parent_issue_id,
        :percent_done => issue.done_ratio,
        :closed => issue.closed?,
        :status => issue.status.name
    })
  end
  
  def add_relation(relation)
    return if @relation_ids.include?(relation[:id])
    @relation_ids.add(relation[:id])
    @response[:relations].push({
        :id => relation[:id],
        :from => relation[:issue_from_id],
        :to => relation[:issue_to_id],
        :type => relation[:relation_type],
        :delay => relation[:delay]
    })
  end

  def issues
    retrieve_query
    @query.group_by = nil

    @response = {:issues => [], :relations => [], :projects => [], :versions => [], :trackers => []}

    # Retrieve all projects
    # TODO: Respond only with projects involved in the issues returned and
    # their ancestors
    @project_ids = {}
    projects = Project.find(:all)
    projects.each do |prj|
        @project_ids[prj.id] = {:identifier => prj.identifier, :name => prj.name}
        @response[:projects].push({
            :id => prj.id,
            :name => prj.name,
            :identifier => prj.identifier
        })
    end

    # Retrieve all trackers
    # TODO: Respond only with trackers relevant for this project
    trackers = Tracker.find(:all)
    @tracker_ids = {}
    trackers.each do |tracker|
        @tracker_ids[tracker.id] = tracker[:name]
        @response[:trackers].push({
            :id => tracker.id,
            :name => tracker.name,
        })
    end

    # Retrieve all versions
    # TODO: Respond only with versions relevant for this project
    versions = Version.find(:all)
    @version_ids = {}
    versions.each do |version|
        @version_ids[version.id] = version[:name]
        @response[:versions].push({
            :id => version.id,
            :name => version.name,
            :start_date => version.start_date,
            :due_date => version.due_date
        })
    end

    # Populate initial list of issues
    @issue_ids = Set.new
    @relation_ids = Set.new
    issues = @query.issues

    iterations = 1
    while true
        # List of new issues to retrieve
        issue_retrieve = Set.new

        # List of new relations to retrieve
        relation_retrieve = Set.new

        # Do a first pass to add all retrieved issues and add their id to the list of relations to fetch
        issues.each do |issue|
          add_issue(issue)
          relation_retrieve.add(issue[:id])
        end
        # Do a second pass to add unseen parent issues to the new list. This is
        # to avoid additional queries since in the first pass, the order may be
        # such that the child tasks are seen before their parents
        issues.each do |issue|
          next unless issue.parent_issue_id
          issue_retrieve.add(issue.parent_issue_id) unless @issue_ids.include?(issue.parent_issue_id)
        end
        
        # Get relations for newly loaded issues
        logger.error(relation_retrieve.to_a)
        relations = IssueRelation.where("issue_from_id IN (:ids) OR issue_to_id IN (:ids)", :ids => relation_retrieve)
        relations.each do |relation|
          add_relation(relation)
          # We should avoid fetching issues just because they are related /
          # duplicated or copied, since those do not impede planning.
          next unless ['precedes', 'blocks'].include?(relation.relation_type)
          issue_retrieve.add(relation[:issue_from_id]) unless @issue_ids.include?(relation[:issue_from_id])
          issue_retrieve.add(relation[:issue_to_id]) unless @issue_ids.include?(relation[:issue_to_id])
        end

        # See if we're done
        break if issue_retrieve.size == 0

        # Retrieve all new issues
        iterations += 1
        issues = Issue.where("id IN (:ids) OR parent_id IN (:ids)", :ids => issue_retrieve)
    end
    logger.info("Retrieved all issues and relations in #{iterations} iteration(s)")

    respond_to do |format|
      format.json { render :json => @response }
    end
  end

  def set_progress
    issue = Issue.find(params[:issue])
    issue.done_ratio = params[:percent_done]
    issue.save
    respond_to do |format|
      format.json { render :json => {:success => true} }
    end
  end

  def create_relation
    @relation = IssueRelation.new(params[:relation])
    @relation.issue_from = @issue
    if params[:relation] && m = params[:relation][:issue_to_id].to_s.strip.match(/^#?(\d+)$/)
      @relation.issue_to = Issue.visible.find_by_id(m[1].to_i)
    end
    saved = @relation.save

    respond_to do |format|
      format.json {
        if saved
          response = {:relation => @relation.serializable_hash, :success => saved}
          render :json => response, :status => :ok
        else
          response = {:relation => @relation.serializable_hash, :success => false}
          render :json => response, :status => :ok
        end
      }
    end
  end
  
  private
  def find_project
    @issue = Issue.find(params[:id])
    @project = @issue.project
  end
end
