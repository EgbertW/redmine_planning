require 'redmine'

Rails.configuration.to_prepare do
  require 'planning_hooks'
end

Redmine::Plugin.register :redmine_planning do
  name        'Redmine Planning plugin'
  author      'Egbert van der Wal'
  description 'Enables users to directly manipulate the Gantt chart by ' +
              'dragging and dropping to improve planning performace'
  version     '0.0.1'

  if respond_to?(:url)
    url 'http://www.assistobot.com/redmine_planning'
  end
  if respond_to?(:author_url)
    author_url 'http://assistobot.com'
  end

  project_module :issue_tracking do
    permission :reschedule_issues, :moves => [:index, :move]
  end
end
