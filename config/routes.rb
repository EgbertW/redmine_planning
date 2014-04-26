RedmineApp::Application.routes.draw do
  post '/issues/:id/move', :to => 'issues#move', :id => /\d+/, :as => 'move_issue'
end
