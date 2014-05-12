require 'json'

class PlanningController < ApplicationController
  unloadable

  menu_item :planning
  before_filter :find_optional_project
  rescue_from Query::StatementInvalid, :with => :query_statement_invalid

  helper :gantt
  helper :issues
  helper :projects
  helper :queries
  include QueriesHelper

  def show
    Redmine::Plugin.mirror_assets(:redmine_planning)
    @planning = {month_from: 5, year_from: 2014}
    @gantt = Redmine::Helpers::Gantt.new(params)
    @gantt.project = @project
    retrieve_query
    @query.group_by = nil
    @gantt.query = @query if @query.valid?

  end

  def issues
    @gantt = Redmine::Helpers::Gantt.new(params)
    @gantt.project = @project
    retrieve_query
    logger.error(@query)
    @query.group_by = nil
    @gantt.query = @query if @query.valid?

    projects = @gantt.projects
    response = {issues: [], relations: []}

    Project.project_tree(projects) do |project, level|
      issues = @gantt.project_issues(project)
      @gantt.class.sort_issues!(issues)
      issues.each do |issue|
        next if issue[:start_date].nil? or issue[:due_date].nil?
        identifier = nil
        projects.each do |prj|
          if prj.id == issue[:project_id]
              identifier = prj.identifier
              break
          end
        end
        response[:issues].push({
            :id => issue[:id],
            :start_date => issue[:start_date],
            :due_date => issue[:due_date],
            :project_id => issue[:project_id],
            :project_identifier => identifier,
            :name => issue[:subject]
        })

      end
    end
    @gantt.relations.each do |from_relation, relations|
        relations.each do |relation|
            logger.error(relation);
            response[:relations].push({
                :id => relation[:id],
                :from => relation[:issue_from_id],
                :to => relation[:issue_to_id],
                :type => relation[:relation_type],
                :delay => relation[:delay]
            })
        end
    end

    respond_to do |format|
      format.html { }
      #format.json { render json: [:status => :ok, :error => '', :issues => issues] }
      format.json { render json: response }
    end
  end
end
