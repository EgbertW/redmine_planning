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

RedmineApp::Application.routes.draw do
  # Global handler
  get '/plan', :to => 'planning#show', :as => 'rmp_gshow_planning'
  post '/plan', :to => 'planning#save', :as => 'rmp_gsave_planning'
  get '/plan/issues', :to => 'planning#issues', :as => 'rmp_gget_issues'

  # Handler for project specific planning
  post '/projects/:project_id/plan', :to => 'planning#save', :id => /\w+/, :as => 'rmp_save_planning'
  get '/projects/:project_id/plan', :to => 'planning#show', :id => /\w+/, :as => 'rmp_show_planning'
  get '/projects/:project_id/plan/issues', :to => 'planning#issues', :id => /\w+/, :as => 'rmp_get_issues'

  # Issue handling
  post '/issues/:id/move', :to => 'moves#move', :id => /\d+/, :as => 'rmp_move_issue'
  post '/issues/:id/rmpcreate', :to => 'planning#create_relation', :id => /\d+/, :as => 'rmp_create_relation'
end
