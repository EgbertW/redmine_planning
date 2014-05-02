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
    unless @issue.start_date.nil?
        @issue.start_date += days.days
    end
    unless @issue.due_date.nil?
        @issue.due_date += days.days
    end
    @issue.save

    respond_to do |format|
      format.html { }
      format.json { render json: [:status => :ok, :start_date => @issue.start_date, :due_date => @issue.due_date] }
    end
  end
end
