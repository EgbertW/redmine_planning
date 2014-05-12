RedmineApp::Application.routes.draw do
#  post '/issues/:id/move', :to => 'issues#move', :id => /\d+/, :as => 'move_issue'
  post '/issues/:id/move', :to => 'moves#move', :id => /\d+/, :as => 'move_issue'
  post '/projects/:project_id/plan', :to => 'planning#save', :id => /\w+/, :as => 'save_planning_project'
  get '/projects/:project_id/plan', :to => 'planning#show', :id => /\w+/, :as => 'planning_project'
  get '/projects/:project_id/plan/issues', :to => 'planning#issues', :id => /\w+/, :as => 'planning_issues'
end
