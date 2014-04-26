require 'redmine'

# TODO: is this needed?
#require 'redmine/i18n'  

#Rails.configuration do
    #require 'redmine_planning'
require_dependency 'planning_issues_controller_patch'
require 'planning_hooks'
#end

Redmine::Plugin.register :redmine_planning do
  extend Redmine::I18n
  File.join(Rails.root, 'vendor', 'plugins',
                        'redmine_stealth', 'config', 'locales', '*.yml')

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

  # Maybe needed for move?
  #permission :move_issue, :issue => :move
end

