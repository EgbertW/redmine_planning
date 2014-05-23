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

module RedminePlanning
  class Hooks < Redmine::Hook::ViewListener
    render_on(:view_issues_sidebar_issues_bottom, :partial => 'hooks/rmp_add_links', :layout => false)

    def view_layouts_base_html_head(context={})
      return context[:controller].send(:render_to_string, {
        :locals => context,
        :partial=> 'hooks/planning_scripts'})
    end
  end
end
