require_dependency 'issues_controller'
require 'rubygems'
require 'json'

module Planning
  module IssuesControllerPatch
    def self.included(base) # :nodoc:
      base.extend(ClassMethods)
      base.send(:include, InstanceMethods)

      base.class_eval do
        unloadable # Send unloadable so it will not be unloaded in development
        after_filter :authorize, :except => [:index, :move]
      end
    end

    module ClassMethods
    end

    module InstanceMethods
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
  end
end

IssuesController.send(:include, Planning::IssuesControllerPatch) unless IssuesController.included_modules.include? Planning::IssuesControllerPatch
