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
  version     '0.5.0'

  if respond_to?(:url)
    url 'https://github.com/MadEgg/redmine_planning'
  end
  if respond_to?(:author_url)
    author_url 'https://github.com/MadEgg/'
  end

  project_module :issue_tracking do
    permission :reschedule_issues, :moves => [:index, :move]
    permission :plan_issues, :planning => [:show, :issues, :save]
  end

  menu :project_menu, :redmine_planning, { :controller => :planning, :action => :show }, :caption => 'Plan', :after => :gantt, :param => :project_id
end
