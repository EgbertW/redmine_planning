# Redmine Planning plugin

This plugin is aimed to make project planning easier using Redmine. While Redmine possesses many functions to update and relate issues, they are not easily usable when making an extensive planning. Creating relations and moving issues has to be done on the corresponding issue page, which can take a long time when updating many issues.

Additionally, constraints are only somewhat enforced but no critical path analysis is performed and it is unknown what limits are available for start and due dates.

The redmine_planning plugin makes this process easier. A tiny update upgrades the existing Gantt chart to make the issues drag-and-droppable. Each issue can easily be rescheduled this way, but no relation checking is done.

The major part of this plugin focuses on a new addition to the project pages, the 'Plan' page. On the Plan page a HTML5 canvas is used to draw the issues and relations and to make it very easy to resize and move issues. In this process, the limits are also taken into account by a (still incomplete) critical path analysis. When moving an issue, dependent issues will be moved along until their respective limits are reached to avoid postponing the entire planning.

## Highlights
* Moving issues by dragging
* Resizing issues by dragging edges
* Creating 'Blocks' or 'Precedes' relations by clicking on the issues
* Remove 'Blocks' or 'Precedes' relations by clicking on them
* Resize parent issues to contain child issues
* Enforce end-to-end (blocks) relations and end-to-begin (precedes) relations
* Interactive scrolling and panning
* Configurable Javascript with different date formats, colors for trackers and branch or leaf issues.

## Installation

```
$ cd /path/to/redmine/plugins
$ git clone https://github.com/MadEgg/redmine_planning
$ <restart web server>
```

This plugin uses no additional tables so no database migration is needed. You do, however, need to give the reschedule permission to users that you want to be able to use this plugin.

## Known issues
* Critical Path Analysis may now work completely when parent issues are involved. **Planned fix**: Being worked on.
* Since copied-to, duplicates and relates relations are not visualized, it is possible to attempt to create a new relation in the Planning chart which is not executed by the server because a relation already exists between these issues. The chart will not recognize failure currently so this will go unnoticed. **Planned fix**: at least recognize and reflect failure in the chart. Additionally, offer to replace existing relations with a blocked or precedes relation.
* May behave a bit slow when many issues are related. **Planned fix**: Only render visible issues on the canvas and remove the invisible ones. Updates to the view box should update the visible issues.
* The tooltip showing issue information may something get in the way when dragging issues. **Planned fix**: do not show any other popups while moving.

# License
Copyright 2014 Egbert van der Wal 

This file is part of redmine_planning

redmine_planning is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

redmine_planning is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with redmine_planning. If not see <http://www.gnu.org/licenses/>.


