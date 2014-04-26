require 'json'

class MovesController < ApplicationController
  unloadable

  def move
  #return unless authorize(controller: 'issues', action: 'update')
  #    @issue.start_date = params[:start_date]
  #    @issue.due_date = params[:end_date]
  #    @issue.save
    respond_to do |format|
      format.html { }
      format.json { render json: [:status => :ok] }
    end
  end
end
