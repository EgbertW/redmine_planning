require 'redmine'

Rails.configuration.to_prepare do
  require 'planning_hooks'
end

Redmine::Plugin.register :redmine_planning do
  name        'Redmine Planning plugin'
  author      'Egbert van der Wal'
  description 'Offers a UI tailored for planning projects by dragging, dropping ' +
              'and resizing issues and by adding and editing relations and ' +
              'providing critical path analysis'
  version     '0.0.1'

  if respond_to?(:url)
    url 'http://www.assistobot.com/redmine_planning'
  end
  if respond_to?(:author_url)
    author_url 'http://assistobot.com'
  end

  project_module :issue_tracking do
    permission :reschedule_issues, :moves => [:index, :move]
    permission :plan_issues, :planning => [:show, :issues]
  end
end
