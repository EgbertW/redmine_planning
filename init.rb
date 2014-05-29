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
  version     '0.8.0-alpha'

  if respond_to?(:url)
    url 'https://github.com/MadEgg/redmine_planning'
  end
  if respond_to?(:author_url)
    author_url 'https://github.com/MadEgg/'
  end

  project_module :issue_tracking do
    permission :reschedule_issues, :moves => [:index, :move]
    permission :plan_issues, :planning => [:show, :issues, :save, :create_relation]
  end

  settings :default => {
        :issue_height =>             20,
        :day_width =>                20,
        :min_zoom_level =>           -2,
        :max_zoom_level =>           3,
        :zoom_factor =>              1.5,
        :margin =>                   {:x => 10, :y => 20},
        :spacing =>                  {:x => 10, :y => 10},
        :issue_resize_border =>      3,
        :tracker => {
            'Default' => {
                :fill_color =>       '#ccc',
                :text_color =>       '#000'
            },
            'Task' => {
                :fill_color =>       '#ccc',
                :text_color =>       '#000'
            },
            'Feature' => {
                :fill_color =>        '#f99',
                :text_color =>        '#000'
            },
            'Support' => {
                :fill_color =>        '#ccc',
                :text_color =>        '#000'
            },
            'Bug' => {
                :fill_color =>        '#ccc',
                :text_color =>        '#000'
            }
        },
        :type => {
            :leaf => {
                :stroke =>           '#800',
                :width =>            2,
                :radius =>           2
            },
            :branch => {
                :stroke =>           '#080',
                :width =>            3,
                :radius =>           2
            },
            :root => {
                :stroke =>          '#080',
                :width =>           3,
                :radius =>          2
            }
        },
        :relation => {
            :precedes => {
                :stroke =>          '#55f',
                :style =>           '->'
            },
            :blocks => {
                :stroke =>          '#f00',
                :style =>           '-*'
            },
            :relates => {
                :stroke =>          '#bbf',
                :style =>           '<-->'
            },
            :copied_to => {
                :stroke =>          '#bfb',
                :style =>           '*--*'
            },
            :duplicates => {
                :stroke =>          '#fbb',
                :style =>           '<--..>'
            },
            :parent => {
                :stroke =>          '#66f',
                :style =>           '--'
            }
        }
    },
    :partial => 'planning/planning_settings';

  menu :project_menu, :redmine_planning, { :controller => :planning, :action => :show }, :caption => 'Plan', :after => :gantt, :param => :project_id
end
