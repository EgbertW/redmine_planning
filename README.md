# Redmine Planning plugin
This plugin is aimed to make project planning easier using Redmine. While Redmine possesses many functions to update and relate issues, they are not easily usable when making an extensive planning. Creating relations and moving issues has to be done on the corresponding issue page, which can take a long time when updating many issues.

Additionally, constraints are only somewhat enforced but no critical path analysis is performed and it is unknown what limits are available for start and due dates.

The redmine_planning plugin makes this process easier. A tiny update upgrades the existing Gantt chart to make the issues drag-and-droppable. Each issue can easily be rescheduled this way, but no relation checking is done.

The major part of this plugin focuses on a new addition to the project pages, the 'Plan' page. On the Plan page a HTML5 canvas is used to draw the issues and relations and to make it very easy to resize and move issues. In this process, the limits are also taken into account by a critical path analysis. When moving an issue, dependent issues will be moved along until their respective limits are reached to avoid postponing the entire planning.

## Highlights
* Moving issues by dragging
* Moving parent tasks with all children by dragging the parent
* Resizing issues by dragging edges
* Creating 'Blocks' or 'Precedes' relations by clicking on the issues
* Remove 'Blocks' or 'Precedes' relations by selecting the 'X' tool and clicking on relations
* Resize parent issues to contain child issues
* Enforce end-to-end (blocks) relations and end-to-begin (precedes) relations
* Interactive scrolling and panning
* Configurable colors for leaf/branch/root issues, trackers and relations using Redmine plugin configuration
* Fully localized, translations for English and Dutch available

## Installation

```
$ cd /path/to/redmine/plugins
$ git clone https://github.com/MadEgg/redmine_planning
$ <restart web server>
```

This plugin uses no additional tables so no database migration is needed. You do, however, need to give the plan and reschedule permission to users that you want to be able to use this plugin. This plugin cannot be enabled or disabled for specific projects but instead hooks into the existing issue tracking project module.

## Translations
All strings have been localized and currently an English and a Dutch translation is available. If you would like your language supported, use the files in config/locales/ as a starting point for translation and submit a pull request when you're done. I'd be happy to merge it in.

## Short manual
### Starting planning
Hit the 'Plan' button next to the 'Gantt' button in any project that has Issue management enabled.

### Navigation
You can use the 'Back 16 days' and 'Forward 16 days' to move in the planning chart. You can also drag the canvas which will move it around. You can also use the scrolwheel to scroll horizontally and vertically. If you hold the Control-button down while scrolling, the chart will zoom in and out to give more overview.

### Types of relations
Redmine supports four types of relations:

* **Blocks** This relation type is represented as *Blocks* or *Blocked by* in Redmine, depending on from which side you look at the relation. This is an end-to-end relation that states that the *Blocked* issue cannot finish before the *Blocking* issue. This will result in the planning chart in an issue where the *Blocked* issue's due date must be before or equal to the *Blocks* issue.
* **Precedes** This relation type is represented as *Precedes* or *Follows* in Redmine, depending on from which side you look at the relation. A delay in days is attached to this relation type. This is an end-to-start relation that states that the *Following* issue starts *Delay* days after the end of the *Preceding* issue. This maintains an equal distance between the two issues during planning.
* **Copied-to** This type of relation is represented as "Copied from" or "Copied to" in Redmine, depending on from which side you look at the relation. This is basically just an administrative note that an issue has been copied to create a similar issue. The planning plugin doesn't do anything with this type of relation yet. It may be changed to at least receive this issue type from the server and otpionally visualize it. It does not influence the dependency checking.
* **Duplicates** This type of relation is represented as "Duplicates" or "Duplicated by" in Redmine, depending on from which side you look at the relation. This is a reference that a newly reported issue is in fact a duplicate of an existing issue. Since this type of relation is usually used for issues that are created by end-users, it is not an integral part of the planning process. Therefore, it is currently ignored by the planning plugin. However, as with *Copied-to* and *Relates*, this may change in the future to optionally visualize these relations, but they will not be used in dependency checking.
* **Relates** This type of relatio is represented as *Related to* in Redmine. There is no clear source or target issue with these relation. The merele specify that there is some kind of relation between the two issues. These relations are currently ignored by Redmine but this may change to be able to visualize them. They will not be used in dependence checking.

### Creating relations
Use the 'Add blocking' or 'Add precedes' buttons to enable relation-creation mode. In this mode, you can create a new relation by first clicking the from issue, the issue preceding / blocking another, and then clicking the to issue, the issue following / being blocked by the first issue. Once you click on the first issue, the mouse cursor will reflect the target state: if it's a + sign, this is a valid target for the relation. If it's a forbidden sign, this relation cannot be created due to the schedule.

If you want to cancel the relation-creation, you can click the 'X' button to cancel the operation.

### Deleting relations
You can delete relations by first clicking the 'X' button and then clicking on the relation. When you are in relation-deletion mode all the lines of the relations will be twice as thick to make them easier to hit. Once you hit it, a popup will ask you to confirm the deletion. To cancel 'Deleting'-mode, click the 'X' button again.

### Moving issues
You can move issues by clicking on the text or the rectangle and dragging it.

When you start dragging the lower and upper limits of the selected issue will be determined by a critical path analysis. This is visualized by two red lines (if applicable) where the first one indicates the minimum starting date and the second one indicates the maximum due date for the issue. Dragging is not allowed past these dates. If you drag the issue and as a result of this related issues need to move as well they will be moved along automatically. This also includes maintaining the delay in 'Precedes' relations.

### Resizing issues
When you hit the left or right edge of the rectangles the cursor will indicate the resizing capability. By clicking and dragging you can make the issue shorter or longer. During resizing, the critical path analysis will be updated to reflect the changes resulting from the resize of the issue. This is mostly relevant for *Blocks* relations because an issue with an incoming *Blocks* relation will be able to start sooner if the duration of the issue is longer.

## Known issues
* Since copied-to, duplicates and relates relations are not visualized, it is possible to attempt to create a new relation in the Planning chart which is not executed by the server because a relation already exists between these issues. The chart will not recognize failure currently so this will go unnoticed. **Planned fix**: at least recognize and reflect failure in the chart. Additionally, offer to replace existing relations with a blocked or precedes relation. This will probably involve switching from the existing IssueRelation controller because the JavaScript-output is hard to parse and the API call gives no information at all. It may also involve optionally visualize other relation-types so that this problem can be detected in JavaScript and handled more intelligently.
* The tooltip showing issue information may something get in the way many issues are close together. **Planned fix**: better placement / close button / to be determined.

# Version log
* 0.6.1: May 19, 2014. Add compatibility with Redmine 2.3.x
* 0.6.0: May 19, 2014. Fully localized plugin with initial translations in English and Dutch.
* 0.5.2: May 19, 2014. Fix superfluous include of RbCommonHelper issue in hook (issue #2)
* 0.5.1: May 19, 2014. Pass along Redmine root-URL to avoid depending on Redmine being installed in the webroot (issue #1)
* 0.5.0: May 17, 2014. Initial release
* Pre-0.5.0: May 9, 2014. Pre-release development

# License
Copyright 2014 Egbert van der Wal 

This file is part of redmine_planning

redmine_planning is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

redmine_planning is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with redmine_planning. If not see <http://www.gnu.org/licenses/>.
