require 'json'

class MovesController < ApplicationController
  unloadable
  before_filter :find_project, :authorize

  def find_project
    @issue = Issue.find(params[:id])
    @project = @issue.project
  end

  def move
    days = params[:days].to_i

    incoming_issues = IssueRelation.where(:issue_to_id => @issue.id, :relation_type => ['blocks', 'precedes', 'follows'])
    outgoing_issues = IssueRelation.where(:issue_from_id => @issue.id, :relation_type => ['blocks', 'precedes', 'follows'])
    
    upper_limit = nil
    lower_limit = nil

    incoming_issues.each do |issue|
      other = Issue.find(issue.issue_from_id)
      case issue.relation_type
      when "blocks"
        if lower_limit.nil? or other.due_date > lower_limit
          lower_limit = other.due_date
        end
      when "precedes"
        # TODO: should move along?!
        #if lower_limit.nil? or other.start_date < lower_limit
        #  upper_limit = other.start_date
        #end
      when "follows"
        # TODO: should move along?!
        #if upper_limit.nil? or other.start_date < upper_limit
        #  upper_limit = other.start_date
        #end
      end
    end
    outgoing_issues.each do |issue|
      other = Issue.find(issue.issue_to_id)
      case issue.relation_type
      when "blocks"
        if upper_limit.nil? or other.start_date < upper_limit
          upper_limit = other.start_date
        end
      when "precedes"
        # TODO: should move along?!
        #if lower_limit.nil? or other.start_date < lower_limit
        #  upper_limit = other.start_date
        #end
      when "follows"
        # TODO: should move along?!
        #if upper_limit.nil? or other.start_date < upper_limit
        #  upper_limit = other.start_date
        #end
      end
    end

    failed = false
    error_message = nil
    orig_start = @issue.start_date
    orig_due = @issue.due_date
    unless @issue.start_date.nil?
      new_date = @issue.start_date += days.days
      if not lower_limit.nil? and new_date < lower_limit
        failed = true
        error_message = "Moving this issue would violate a relation with a different issue"
      else
        @issue.start_date = new_date
      end
    end
    unless @issue.due_date.nil? or failed
      new_date = @issue.due_date += days.days
      if not upper_limit.nil? and new_date > upper_limit
        failed = true
        error_message = "Moving this issue would violate a relation with a different issue"
      else
        @issue.due_date = new_date
      end
    end

    result = :ok
    if failed
      @issue.start_date = orig_start
      @issue.due_date = orig_due
      result = :failure
    else
      @issue.save
    end

    respond_to do |format|
      format.html { }
      format.json { render json: [:status => result, :error => error_message, :start_date => @issue.start_date, :due_date => @issue.due_date] }
    end
  end
end
