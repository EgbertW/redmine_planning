/*
Copyright 2014 Egbert van der Wal <egbert@robovalley.com>

This file is part of redmine_planning

redmine_planning is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

redmine_planning is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with redmine_planning. If not see <http://www.gnu.org/licenses/>.
*/

// Create the Object.keys function for those that do not support it (IE 8.0)
if (!Object.keys)
{
    Object.keys = function (obj)
    {
        var keys = [];
        for (var k in obj)
            if (obj.hasOwnProperty(k))
                keys.push(k);
    };
}

Function.prototype.inherits = function (parent)
{
    var keys = Object.keys(parent.prototype);
    for (var iter = 0; iter < keys.length; ++iter)
        this.prototype[keys[iter]] = parent.prototype[keys[iter]];
};

/* DateInterval class definition */
function DateInterval(ms)
{
    this.ms = ms;
}

DateInterval.prototype.seconds = function ()
{
    return this.ms / 1000;
};

DateInterval.prototype.minutes = function ()
{
    return this.ms / 60000;
};

DateInterval.prototype.hours = function ()
{
    return this.ms / 3600000;
};

DateInterval.prototype.days = function ()
{
    return this.ms / 86400000;
};

DateInterval.createDays = function (n)
{
    return new DateInterval(86400000 * n);
};

DateInterval.createHours = function (n)
{
    return new DateInterval(3600000 * n);
};

DateInterval.createMinutes = function (n)
{
    return new DateInterval(60000 * n);
};

DateInterval.createSeconds = function (n)
{
    return new DateInterval(1000 * n);
};

/* Inject DateInterval into Date class */
Date.prototype.subtract = function (other)
{
    if (other instanceof Date)
        return new DateInterval(this - other);
    else if (other instanceof DateInterval)
        return new Date(this.getTime() - other.ms);
    else
        throw "Invalid argument: " + other;
};

Date.prototype.add = function (interval)
{
    var r = new Date();
    r.setTime(this.getTime() + interval.ms);
    return r;
};

Date.prototype.toISODateString = function ()
{
    return this.getFullYear() + "-" + (this.getMonth() + 1) + "-" + this.getDate();
};

Date.prototype.resetTime = function ()
{
    this.setUTCHours(12);
    this.setUTCMinutes(0);
    this.setUTCSeconds(0);
};

function rmp_getToday()
{
    var today = new Date();
    today.resetTime();
    var d = today.getDate();
    if (d % 2)
        --d;
    today.setUTCDate(d);
    return today;
}

function rmp_clamp(val, min, max)
{
    if (jQuery.isArray(min))
        return Math.max(min[0], Math.min(min[1], val));
    return Math.max(min, Math.min(max, val));
}

PlanningIssue.prototype.showTooltip = function ()
{
    var $ = jQuery;
    var issue = this;
    var d = $('.planning_tooltip');

    if (d.length && d.data('issue_id') === this.id)
        return;

    if (this.chart.tooltip_timer)
    {
        clearInterval(this.chart.tooltip_timer);
        delete this.chart.tooltip_timer;
    }

    this.chart.tooltip_timer = setTimeout(function () {
        issue._showTooltip();
    }, this.chart.options['tooltip_timeout']);
}

PlanningIssue.prototype._showTooltip = function ()
{
    var $ = jQuery;
    var issue = this;

    var d = $('.planning_tooltip');
    if (d.length)
    {
        if (d.data('issue_id') == this.id)
        {
            var to = d.data('timeout');
            if (to)
            {
                d.data('timeout', null);
                clearTimeout(to);
            }
            return;
        }
        d.remove();
    }

    d = $('<div></div>');
    d.data('issue_id', this.id);

    var fs = jQuery('#planning_fullscreen_overlay').length > 0;
    var s = this.chart.getScale();
    var pos = this.chart.chart_area.position();
    var x = s[0] * (this.geometry.x - this.chart.viewbox.x) + pos.left + 15;
    var y = s[1] * (this.geometry.y - this.chart.viewbox.y + this.chart.options.issue_height + this.chart.options.spacing.y) + pos.top + 100;

    if (x < pos.left)
        x = pos.left;

    d.addClass('planning_tooltip')
    .attr('lang', 'en')
    .css({
        'left': x,
        'top': y,
        'position': fs ? "fixed" : "absolute"
    });

    var parent_issue = 'none';
    var url;
    if (this.parent_issue)
    {
        url = redmine_planning_settings.urls.root + 'issues/' + this.parent_issue.id;
        parent_issue = '<a href="' + url + '" target="_blank">' +
            this.parent_issue.tracker + ' #' + this.parent_issue.id + ': ' + this.parent_issue.name +
            '</a>';
    }
    else if (this.parent_id)
    {
        url = redmine_planning_settings.urls.root + 'issues/' + this.parent_id;
        parent_issue = '<a href="' + url + '" target="_blank">' +
            "#" + this.parent_id + " (" + this.t('unavailable') + ")";
    }

    var desc = this.description;

    // Truncate description to don't fill the entire screen
    if (!desc)
        desc = "";
    //if (desc.length > 500)
    //    desc = desc.substr(0, 300);

    // Replace HTML reserved characters with HTML entities
    desc = desc.replace(/</g, "&lt;");
    desc = desc.replace(/>/g, "&gt;");
    desc = desc.replace(/&/g, "&amp;");
    desc = desc.replace(/"/g, "&quot;");

    // Replace line breaks with <br>
    desc = desc.replace(/\n/g, "<br />");

    // Make sure text is wrapped / hyphenated if the browser supports it. Break
    // extremely long strings by forcefully adding &shy; markers.
    var prev;
    while (desc !== prev)
    {
        prev = desc;
        desc = prev.replace(/([^\s&\-]{10,})([^\s&\-]{10,})/g, "$1&shy;$2");
    }

    var prj_url = redmine_planning_settings.urls.root + 'projects/' + this.project_identifier;
    url = redmine_planning_settings.urls.root + 'issues/' + this.id;

    var prj_url = redmine_planning_settings.urls.root + 'projects/' + this.project_identifier;
    url = redmine_planning_settings.urls.root + 'issues/' + this.id;

    d.html(
        '<table cellpadding="2">' +
        '<tr><th colspan="2" style="text-align: left; padding-bottom: 5px;">' + this.tracker + ' <a href="' + url + '" target="_blank">#' + this.id + '</a>: ' + this.name + '</th></tr>' +
        '<tr><th>' + this.t('project') + ': </th><td><a href="' + prj_url + '" target="_blank">' + this.project.name + '</a></td></tr>' + 
        '<tr><th>' + this.t('parent_task') + ': </th><td>' + parent_issue + '</td></tr>' +
        '<tr><th>' + this.t('start_date') + ': </th><td>' + this.chart.formatDate(this.start_date) + '</td></tr>' + 
        '<tr><th>' + this.t('due_date') + ': </th><td>' + this.chart.formatDate(this.due_date) + '</td></tr>' + 
        '<tr><th>' + this.t('leaf_task') + ': </th><td>' + (this.leaf ? this.t('yes') : this.t('no')) + '</td></tr>' +
        '<tr><th>' + this.t('is_closed') + ': </th><td>' + (this.closed ? this.t('yes') : this.t('no')) + '</td></tr>' +
        '<tr><th>' + this.t('field_done_ratio') + ': </th><td>' + (this.progress) + '%</td></tr>' +
        '<tr><th>' + this.t('description') + ': </th><td>' + desc + '</td></tr>' 
    );

    // Append to body and show to determine the final dimensions of the tooltip
    $('body').append(d);
    d.show();

    // Move to the left if it would result fall of the right side of the screen
    var width = d.outerWidth();
    var window_width = jQuery(window).innerWidth();
    if (x + width > window_width)
        d.css('left', window_width - width - 5);

    // Move to above the issue if it would fall of the bottom of the screen
    var height = d.outerHeight();
    var window_height = jQuery(window).innerHeight();
    var scroll_top = fs ? 0 : jQuery(window).scrollTop();
    if (y + height > window_height + scroll_top)
    {
        y = s[1] * (this.geometry.y - this.chart.viewbox.y - this.chart.options.spacing.y) + pos.top - height;
        d.css('top', y);
    }

    // Add hover handler
    d.on("mouseenter", function ()
    {
        var tt = jQuery(this);
        tt.show();
        var to = jQuery(this).data('timeout');
        if (to)
        {
            clearTimeout(to);
            tt.data('timeout', null);
        }
    }).on("mouseleave", function ()
    {
        issue.closeTooltip();
    });
};

/* Chart class definition */
function PlanningChart(options)
{
    var defaults = {
        target: 'redmine_planning_chart',
        issue_height: 20,
        day_width: 20,
        zoom_level: 0,
        min_zoom_level: -2,
        max_zoom_level: 3,
        zoom_factor: 1.5,
        margin: {x: 10, y: 20},
        spacing: {x: 10, y: 10},
        issue_resize_border: 3,
        date_format: '%d/%m/%Y',
        tooltip_timeout: 500,
        month_names: [null, 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
        abbr_month_names: [null, 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        project: '',
        on_move_issues: null,
        on_delete_relation: null,
        on_create_relation: null,
        tracker: {
            'Default': {
                fill_color: '#ccc',
                text_color: '#000'
            },
            'Task': {
                fill_color: '#ccc',
                text_color: '#000'
            },
            'Feature': {
                fill_color: '#f99',
                text_color: '#000'
            },
            'Support': {
                fill_color: '#ccc',
                text_color: '#000'
            },
            'Bug': {
                fill_color: '#ccc',
                text_color: '#000'
            }
        },
        type: {
            leaf: {
                stroke:     '#800',
                width:      2,
                radius:     2
            },
            branch: {
                stroke:     '#080',
                width:      3,
                radius:     2
            },
            root: {
                stroke:     '#080',
                width:      3,
                radius:     2
            },
            milestone: {
                stroke:     '#222',
                width:      3,
                radius:     0,
                fill:       '#666'
            }
        },
        relation: {
            precedes: {
                stroke:             '#55f',
                style:              '->'
            },
            blocks: {
                stroke:             '#f00',
                style:              '-*'
            },
            relates: {
                stroke:             '#bbf',
                style:              '<-->'
            },
            copied_to: {
                stroke:             '#bfb',
                style:              '*--*'
            },
            duplicates: {
                stroke:             '#fbb',
                style:              '<--..>'
            },
            parent: {
                stroke:             '#66f',
                style:              '--'
            }
        }
    };

    if (!options)
        options = {};

    this.options = this.extend(defaults, options);

    if (this.options.target.substr(0, 1) == '#')
        this.options.target = this.options.target.substr(1);

    this.id_counter = 1000000;
    this.mode = "move";

    var numeric = {
        'issue_height': parseInt,
        'day_width': parseInt,
        'zoom_level': parseInt,
        'min_zoom_level': parseInt,
        'max_zoom_level': parseInt,
        'zoom_factor': parseFloat,
        'issue_resize_border': parseInt
    };
    var keys = Object.keys(numeric);
    for (var iter = 0; iter < keys.length; ++iter)
        this.options[keys[iter]] = numeric[keys[iter]](this.options[keys[iter]]);
    this.options.margin.x = parseInt(this.options.margin.x, 10);
    this.options.margin.y = parseInt(this.options.margin.y, 10);
    this.options.spacing.x = parseInt(this.options.spacing.x, 10);
    this.options.spacing.y = parseInt(this.options.spacing.y, 10);

    // Set up translations
    this.translations = {
        parent_task: 'Parent task',
        start_date: 'Start date',
        due_date: 'Due date',
        description: 'Description',
        leaf_task: 'Leaf task',
        milestone: 'Milestone',
        yes: 'yes',
        no: 'no',
        project: 'Project',
        unavailable: 'unavailable',
        adding_relation_failed: 'Adding relation failed',
        move_to: 'Move to',
        confirm_remove_relation: 'Are you sure you want to remove the ##1 relation from ##2 to ##3?'
    };

    if (this.options.translations)
    {
        jQuery.extend(this.translations, this.options.translations);
        delete this.options.translations;
    }

    var relating = null;
    this.issues = {'length': 0};
    this.relations = {'length': 0};
    this.projects = {'length': 0 };
    this.milestones = {'length': 0};
    this.changed = {};
    this.setBaseDate(this.options.base_date ? this.options.base_date : rmp_getToday());
    this.container = jQuery('#' + this.options.target);
    var chart = this;

    // Set up the GUI
    this.setupDOMElements();
    var w = this.container.innerWidth();
    var h = this.container.innerHeight();
    this.paper = Raphael(this.chart_area.attr('id'), w, h);
    this.geometry_limits = {x: [-w / 2, w / 2], y: [0, 0]};
    this.setViewBox(Math.round(w / -2), 0, w, h);
    this.addBackground();

    // Scroll or zoom when using the mouse wheel
    var mouseFn = function (evt)
    {
        chart.mousewheel.call(chart, evt);
    }
    this.chart_area.on('mousewheel', mouseFn);

    // Resize the planning chart when the window resizes
    var resizeFn = function (evt)
    {
        chart.resize(evt);
    };
    jQuery(window).on('resize', resizeFn);
    
    // Call handler asynchronously to be able to set the size of the planning
    // list In Chrome it usually works fine without this, in Firefox the
    // position() method of jQuery seems unreliable after the element has just
    // been appended.
    setTimeout(function ()
    {
        jQuery(window).resize();
    }, 10);
}

PlanningChart.prototype.extend = function (target, data)
{
    // Iterate over all elements
    for (var k in data)
    {
        // Safety check
        if (!data.hasOwnProperty(k))
            continue;

        // Deep-merge objects
        if (target[k] && typeof target[k] === 'object')
        {
            if (typeof data[k] !== 'object')
                throw "Invalid value for key " + k;
            this.extend(target[k], data[k]);
        }
        // Deep-merge arrays
        else if (target[k] && jQuery.isArray(target[k]))
        {
            if (!jQuery.isArray(target[k]))
                throw "Invalid value for key " + k;
            this.extend(target[k], data[k]);
        }
        // Overwrite values
        else
            target[k] = data[k];
    }
    return target;
}

PlanningChart.prototype.sortIssues = function (callback)
{
    if (!callback)
    {
        callback = function (a, b)
        {
            if (a.start_date === null && b.start_date === null)
                return 0;
            else if (a.start_date === null)
                return 1;
            else if (b.start_date === null)
                return -1;

            return a.start_date.subtract(b.start_date).days();
        };
    }

    var iter;
    var iKeys = Object.keys(this.issues);
    var k;
    var list = [];
    var done = {};
    for (iter = 0; iter < iKeys.length; ++iter)
    {
        k = iKeys[iter];
        if (k == "length")
            continue;

        if (this.issues[k].visible)
            list.push(this.issues[k]);
    }

    // Add all issues without a parent to the queue
    var queue = [];
    for (iter = 0; iter < list.length; ++iter)
    {
        if (!list[iter].parent_issue)
            queue.push(list[iter]);
    }

    // Sort initial queue by the callback sort function
    queue.sort(callback);

    // Start renumbering using the queue as a starting point
    var idx = 0;
    while (queue.length)
    {
        // Remove the first element and set the index
        var current = queue.shift();
        if (current.visible)
            current.idx = idx++;

        if (!current.collapsed)
        {
            // Sort the children as they're up next
            current.children.sort(callback);

            // Add children issues to front of the queue, in reverse order as
            // they'll be reversed in the process of unshifting
            for (iter = current.children.length - 1; iter >= 0; --iter)
                queue.unshift(current.children[iter]);
        }
    }
}

PlanningChart.prototype.mousewheel = function (e)
{
    // Try to avoid default browser scrolling behavior. However, in Chrome,
    // this doesn't seem to work. That is why, in addition to Ctrl+Scroll ->
    // Zoom, Alt+Scroll also works.
    e.preventDefault();
    e.stopImmediatePropagation();

    if (!e.ctrlKey && !e.altKey)
    {
        var v = e.deltaY > 0 ? -1 : (e.deltaY < 0 ? 1 : 0);
        var h = e.deltaX > 0 ? 1 : (e.deltaX < 0 ? -1 : 0);

        var day_factor = Math.max(1, Math.pow(2, (-this.options.zoom_level) + 1));
        var new_x = this.viewbox.x + h * this.dayWidth() * day_factor;
        var new_y = this.viewbox.y + v * (this.options.issue_height + this.options.spacing.y) * 1;

        this.setViewBox(new_x, new_y, this.viewbox.w, this.viewbox.h);

        var scale = this.getScale();
        jQuery('#planning_list .table').data('ignore', true).scrollTop(this.viewbox.y * scale[1]);
    }
    else
    {
        var zoom = this.options.zoom_level;

        if (e.deltaY > 0)
            ++zoom;
        else if (e.deltaY < 0)
            --zoom;
        this.setZoom(zoom, e.offsetX, e.offsetY);
    }
};

PlanningChart.prototype.setZoom = function (zoom, x, y)
{
    var min_zoom_level = -2;
    var zoom_upper_limit = 3;
    var zoom_factor = 1.5;
    zoom = rmp_clamp(zoom, this.options.min_zoom_level, this.options.max_zoom_level);

    if (zoom === this.options.zoom_level)
        return;

    this.options.zoom_level = zoom;

    // Determine new width and height
    var new_w = Math.round(this.chart_area.width() / Math.pow(this.options.zoom_factor, zoom));
    var new_h = Math.round(this.chart_area.height() / Math.pow(this.options.zoom_factor, zoom));

    // We want the center to go to the point where the scroll button was hit
    var cx = this.viewbox.x;
    var cy = this.viewbox.y;

    if (x !== undefined && y !== undefined)
    {
        var center_pos = this.clientToCanvas(x, y);
        if (new_w < this.viewbox.w)
            cx = Math.round(center_pos[0] - new_w / 2);
        if (new_h < this.viewbox.h)
            cy = Math.round(center_pos[1] - new_h / 2);
    }

    this.setViewBox(cx, cy, new_w, new_h);

    // Update sizes in issue list
    var scale = this.getScale();
    var row_height = this.options.issue_height + this.options.spacing.y;
    var dom_row_height = row_height * scale[1];
    var ikeys = Object.keys(this.issues);
    var k;
    var issue;
    for (var iter = 0; iter < ikeys.length; ++iter)
    {
        k = ikeys[iter];
        if (k == "length")
            continue;
        
        issue = this.issues[k];
        var row = issue.list_row;
        row.css({ 
            top: (this.options.margin.y - (this.options.spacing.y / 2) + row_height * issue.idx) * scale[1],
            height: dom_row_height
        });

        var font_size = Math.min(dom_row_height * 0.5, 14);
        row.children().css({
            'line-height': dom_row_height - 3 + 'px',
            'font-size': font_size + 'px',
            'height': dom_row_height - 3
        });
    }

    this.issue_list.find('.table').scrollTop(this.viewbox.y * scale[1]);
};

PlanningChart.prototype.resize = function ()
{
    var fs = jQuery('#planning_fullscreen_overlay');
    var mb = 200;
    var w;
    var h;
    if (fs.length)
    {
        var tb = jQuery('#planning_toolbar').outerHeight(true);
        var wh = jQuery(window).innerHeight();
        h = wh - tb - 10;
        w = jQuery(window).innerWidth() - 2;
        mb = 0;
    }
    else
    {
        var pos = this.chart_area.position();
        var footHeight = jQuery('#footer').outerHeight();
        var contentPadding = parseInt(jQuery('#content').css('padding-bottom'), 10);
        h = Math.max(500, jQuery(window).innerHeight() - pos.top - footHeight - contentPadding);
        w = jQuery(window).innerWidth();
    }

    this.chart_area.css({
        'width': w,
        'height': h,
        'margin-bottom': mb
    });
    if (this.paper)
    {
        // Adjust viewbox to keep the same scale
        var w_factor = w / this.paper.width;
        var h_factor = h / this.paper.height;
        this.paper.setSize(w, h);
        this.setViewBox(this.viewbox.x, this.viewbox.y, this.viewbox.w * w_factor, this.viewbox.h * h_factor);

        var scale = this.getScale();
        jQuery('.planning_list_table').scrollTop(this.viewbox.y * scale[1]);
    }

    // Update position and size of issue list
    var pos = this.chart_area.position();
    this.issue_list.css({
        position: fs.length ? 'fixed' : 'absolute',
        top: pos.top,
        left: pos.left,
        zIndex: 10,
        height: this.chart_area.outerHeight()
    });
};

PlanningChart.prototype.t = function t(str)
{
    // HACK ALERT: Ruby converts Yes to true when generating JSON, therefore we
    // have to fix it here until I find a better solution
    if (str == "yes")
        str = true;
    else if (str == "no")
        str = false;

    str = this.translations[str] ? this.translations[str] : "N/A";

    for (var iter = 1; iter < arguments.length; ++iter)
        str = str.replace("##" + iter, arguments[iter]);

    return str;
};

PlanningChart.prototype.setMonthNames = function (names, abbreviations)
{
    this.options.month_names = jQuery.extend({}, names);
    this.options.abbr_month_names = jQuery.extend({}, abbreviations);
};

PlanningChart.prototype.setupDOMElements = function ()
{
    var buttons = [
        [
            {
                type: 'button',
                id: 'planning_back_button',
                data: {type: 'scroll', days: -16, issues: 0},
                icon: 'ion-skip-backward',
                title: this.t('back_16_days')
            },
            {
                type: 'button',
                id: 'planning_select_date_button',
                data: {type: 'setdate'},
                icon: 'ion-calendar',
                title: this.t('select_date')
            },
            {
                type: 'button',
                id: 'planning_forward_button',
                data: {type: 'scroll', days: 16, issues: 0},
                icon: 'ion-skip-forward',
                title: this.t('forward_16_days')
            }
        ],
        [
            {
                type: 'radio',
                id: 'planning_move_button',
                icon: 'ion-arrow-move',
                data: {type: 'move'},
                default: true,
                title: this.t('move')
            },
            {
                type: 'radio',
                id: 'planning_precedes_button',
                data: {type: 'add_relation', subtype: 'precedes'},
                icon: 'ion-arrow-right-c',
                title: this.t('add_precedes')
            },
            {
                type: 'radio',
                id: 'planning_blocks_button',
                data: {type: 'add_relation', subtype: 'blocks'},
                icon: 'ion-arrow-return-right',
                title: this.t('add_blocks')
            },
            {
                type: 'radio',
                id: 'planning_duplicates_button',
                data: {type: 'add_relation', subtype: 'duplicates'},
                icon: 'ion-loop',
                title: this.t('add_duplicates')
            },
            {
                type: 'radio',
                id: 'planning_relates_button',
                data: {type: 'add_relation', subtype: 'relates'},
                icon: 'ion-arrow-swap',
                title: this.t('add_relates')
            },
            {
                type: 'radio',
                id: 'planning_copied_to_button',
                data: {type: 'add_relation', subtype: 'copied_to'},
                icon: 'ion-ios7-copy',
                title: this.t('add_copied_to')
            },
            {
                type: 'delete',
                id: 'planning_delete_button',
                data: {type: 'delete'},
                icon: 'ion-close-round',
                title: this.t('delete_relation')
            }
        ],
        [
            {
                type: 'button',
                id: 'planning_sort_button',
                data: {type: 'sort'},
                icon: 'ion-android-sort',
                title: this.t('sort')
            },
            {
                type: 'button',
                id: 'planning_zoom_in_button',
                data: {type: 'zoom', direction: 1},
                icon: 'ion-plus-round',
                title: this.t('zoom_in')
            },
            {
                type: 'button',
                id: 'planning_zoom_out_button',
                data: {type: 'zoom', direction: -1},
                icon: 'ion-minus-round',
                title: this.t('zoom_out')
            },
            {
                type: 'button',
                id: 'planning_fullscreen_button',
                data: {type: 'fullscreen'},
                icon: ['ion-arrow-expand', 'ion-arrow-shrink'],
                title: this.t('fullscreen')
            }
        ]
    ];

    var $ = jQuery;
    this.toolbar = $('<div></div>').css({
        textAlign: 'center',
        width: '100%'
    }).attr('id', 'planning_toolbar');

    // Create container for canvas and (try to) disable right clicks in it
    this.chart_area = $('<div></div>')
        .attr('id', 'planning_chart')
        .on('contextmenu', function (e) {
            if (e.stopPropagation)
                e.stopPropagation();
            if (e.stopImmediatePropagation)
                e.stopImmediatePropagation();
            e.cancelBubble = false;
            return false;
        });

    var i, j, button, label, set, icon;
    this.buttons = {};
    for (i = 0; i < buttons.length; ++i)
    {
        set = $('<div></div>').addClass('planning_toolbar_button_set');
        for (j = 0; j < buttons[i].length; ++j)
        {
            if (buttons[i][j].type === "button")
            {
                icon = buttons[i][j].icon;
                if (jQuery.isArray(icon))
                    icon = icon[0];
                button = $('<button></button>')
                    .attr('id', buttons[i][j].id)
                    .attr('title', buttons[i][j].title)
                    .addClass(icon)
                    .addClass('planning_button');
                if (buttons[i][j].data)
                    button.data(buttons[i][j].data);
                set.append(button);
                buttons[i][j].button = button;
            }
            else
            {
                button = $('<input />')
                    .attr('id', buttons[i][j].id)
                    .attr('type', 'radio')
                    .attr('name', 'planning-bs-' + i)
                    .addClass('planning_button');
                if (buttons[i][j].data)
                    button.data(buttons[i][j].data);
                label = $('<label></label>')
                    .attr('for', buttons[i][j].id)
                    .attr('title', buttons[i][j].title)
                    .addClass(buttons[i][j].icon);
                if (buttons[i][j].default)
                    button.prop('checked', true);
                set.append(button, label);
                buttons[i][j].button = button;
                buttons[i][j].label = label;
            }
            this.buttons[buttons[i][j].id] = buttons[i][j];
        }
        this.toolbar.append(set);
        set.buttonset();
    }

    var chart = this;
    var cb = this.toolbar.find('#planning_select_date_button');
    var inp = jQuery('<input />').attr('id', 'planning_select_date_button_input').hide().val(this.formatDate(rmp_getToday()));
    cb.before(inp);
    inp.datepicker({
        changeMonth: true,
        changeYear: true,
        showWeek: true,
        firstDay: 1,
        onClose: function (date, picker)
        {
            var base_date = jQuery(this).datepicker('getDate');
            base_date.resetTime();
            chart.setBaseDate(base_date);
            chart.draw();
        }
    });

    this.container.append(this.toolbar, this.chart_area);
    
    // Create container for list with issues
    var pos = this.chart_area.position();
    this.issue_list = $('<div></div>')
        .attr('id', 'planning_list')
        .css({
            position: 'absolute',
            top: pos.top,
            left: pos.left,
            zIndex: 10,
            width: 250,
            height: Math.max(480, this.chart_area.outerHeight()),
            backgroundColor: '#fff'
        });
    this.container.append(this.issue_list);

    var chart = this;
    jQuery('.planning_button').click(function ()
    {
        var button = jQuery(this);
        var type = button.data('type');
        switch (type)
        {
            case "add_relation":
                chart.elements.relations.attr('stroke-width', 2);
                chart.deleting = null;
                chart.createRelation(button.data('subtype'));
                break;
            case "move":
                chart.deleting = chart.relating = null;
                chart.elements.relations.attr('stroke-width', 2);
                break;
            case "delete":
                chart.relating = null;
                chart.deleting = true;
                chart.elements.relations.attr('stroke-width', 4);
                break;
            case "scroll":
                chart.setBaseDate(chart.base_date.add(DateInterval.createDays(button.data('days'))));
                chart.viewbox.y += button.data('issues') * chart.options.issue_height;
                chart.setViewBox(Math.round(chart.viewbox.w / -2), chart.viewbox.y, chart.viewbox.w, chart.viewbox.h);
                chart.draw();
                break;
            case "setdate":
                button.prev('input').datepicker('show');
                break;
            case "fullscreen":
                chart.toggleFullscreen();
                break;
            case "zoom":
                chart.setZoom(chart.options.zoom_level + button.data('direction'));
                break;
            case "sort":
                chart.sortIssues();
                chart.draw();
                break;
        }
    });
};

PlanningChart.prototype.toggleFullscreen = function ()
{
    var def = this.buttons['planning_fullscreen_button'];
    var button = def.button;

    var fs = jQuery('#planning_fullscreen_overlay');
    var tb = jQuery('#planning_toolbar');
    var ch = jQuery('#planning_chart');
    var list = jQuery('#planning_list');

    if (fs.length > 0)
    {
        fs.children().removeClass('fullscreen');

        list.css('z-index', 110);
        this.container.append(tb, ch, list); 
        fs.remove();
        button.removeClass(def.icon[1]).addClass(def.icon[0]);
    }
    else
    {
        fs = jQuery('<div></div>').attr('id', 'planning_fullscreen_overlay');
        fs.appendTo('body').append(tb, ch, list).children().addClass('fullscreen');
        button.removeClass(def.icon[0]).addClass(def.icon[1]);
    }
    jQuery(window).resize();
};

PlanningChart.prototype.getTrackerAttrib = function (tracker, attrib)
{
    if (this.options.tracker[tracker] && this.options.tracker[tracker][attrib])
        return this.options.tracker[tracker][attrib];
    return this.options.tracker.Default[attrib];
};

PlanningChart.prototype.getRelationAttributes = function (relation_type)
{
    var attributes = {
        'stroke-width': 2,
        'stroke': this.options.relation[relation_type].stroke
    };

    var style = this.options.relation[relation_type].style;
    var start_arrow = "";
    var end_arrow = "";

    var ch = style.substr(0, 1);
    if (ch == "*" || ch == "<" || ch == ">")
    {
        if (ch == "*")
            attributes['arrow-start'] = "diamond-wide-long";
        else if (ch == "<")
            attributes['arrow-start'] = "classic-wide-long";
        else if (ch == ">")
            attributes['arrow-start'] = "classic-wide-long";
        style = style.substr(1);
    }

    ch = style.substr(style.length - 1, 1);
    if (ch == "*" || ch == "<" || ch == ">")
    {
        if (ch == "*")
            attributes['arrow-end'] = "diamond-wide-long";
        else if (ch == "<")
            attributes['arrow-end'] = "classic-wide-long";
        else if (ch == ">")
            attributes['arrow-end'] = "classic-wide-long";
        style = style.substr(0, style.length - 1);
    }

    if (style != "-")
        attributes['stroke-dasharray'] = style;

    return attributes;
};

PlanningChart.prototype.setBaseDate = function (date)
{
    var base_date = new Date(date.getTime());
    base_date.resetTime();
    base_date.setUTCDate(date.getDate());

    var reference = new Date();
    reference.resetTime();
    reference.setUTCDate(1);
    reference.setUTCMonth(1);
    reference.setUTCFullYear(2014);

    var diff = Math.round(base_date.subtract(reference).days()) % 4;
    base_date = base_date.add(DateInterval.createDays(-diff));
    this.base_date = date;
};

PlanningChart.prototype.setViewBox = function (x, y, w, h)
{
    // Set new viewbox
    if (!this.viewbox)
        this.viewbox = {};

    this.viewbox.x = x = rmp_clamp(x, this.geometry_limits.x);
    this.viewbox.y = y = rmp_clamp(y, this.geometry_limits.y[0], Math.max(0, this.geometry_limits.y[1] - h));

    this.viewbox.w = w;
    this.viewbox.h = h;
    this.paper.setViewBox(this.viewbox.x, this.viewbox.y, this.viewbox.w, this.viewbox.h);

    // Update header
    var start_day = Math.round(x / this.dayWidth());
    var end_day = Math.round((x + w) / this.dayWidth());
    var start_date = this.base_date.add(DateInterval.createDays(start_day));
    var end_date = this.base_date.add(DateInterval.createDays(end_day));

    this.drawHeader(start_date, end_date);

    // Update issues
    var keys = Object.keys(this.issues);
    var k; // Key iterator
    for (var iter = 0; iter < keys.length; ++iter)
    {
        k = keys[iter];
        if (k == "length")
            continue;

        if (
            this.issues[k].geometry.x + this.issues[k].geometry.width >= x &&
            this.issues[k].geometry.x <= x + w &&
            this.issues[k].geometry.y >= this.viewbox.y + this.options.margin.y
        )
        {
            if (!this.issues[k].element)
            {
                this.issues[k].draw();
                this.issues[k].updateRelations();
            }
        }
        else if (this.issues[k].element)
        {
            this.issues[k].draw();
        }
    }
};

PlanningChart.prototype.createRelation = function (type)
{
    if (type !== "blocks" && type !== "precedes" && type !== "relates" && type !== "copied_to" && type !== "duplicates")
        throw "Invalid relation: " + type;
    this.relating = {'type': type, 'from': null, 'to': null};
};

PlanningChart.prototype.dayWidth = function ()
{
    return this.options.day_width;
};

PlanningChart.prototype.formatDate = function (date)
{
    if (!date || date.getFullYear() == "1970")
        return "Not set";

    var d = date.getDate();
    var m = date.getMonth() + 1;
    var y = date.getYear();
    var yy = date.getFullYear();
    var b = this.options.abbr_month_names[m];
    var B = this.options.month_names[m];

    var fmt = this.options.date_format + "";
    fmt = fmt
        .replace("%d", d)
        .replace("%m", m)
        .replace("%y", y)
        .replace("%Y", yy)
        .replace("%b", b)
        .replace("%B", B);
    return fmt;
};

PlanningChart.prototype.addProject = function (project)
{
    if (this.projects[project.id])
        return;

    project.setChart(this, this.projects.length++);
    this.projects[project.id] = project;
};

PlanningChart.prototype.removeProject = function (id)
{
    if (this.projects[id])
    {
        delete this.projects[id];
    }
};

PlanningChart.prototype.addIssue = function (issue)
{
    if (this.issues[issue.id])
        return;

    issue.setChart(this, this.issues.length++);
    this.issues[issue.id] = issue;
};

PlanningChart.prototype.removeIssue = function (id)
{
    if (this.issues[id])
    {
        if (this.issues[id].element)
            this.issues[id].element.remove();
        delete this.issues[id];
    }
};

PlanningChart.prototype.addRelation = function (relation)
{
    if (this.relations[relation.id])
        return this.relations[relation.id];

    if (!this.issues[relation.from])
        return relation;

    if (!this.issues[relation.to])
        return relation;

    relation.setChart(this, this.relations.length++);
    this.relations[relation.id] = relation;

    // Set up additional info
    relation.fromIssue = this.issues[relation.from].addRelation(relation);
    relation.toIssue = this.issues[relation.to].addRelation(relation);
    return relation;
};

PlanningChart.prototype.removeRelation = function (id)
{
    if (this.relations[id])
    {
        if (this.relations[id].element)
            this.relations[id].element.remove();
        var iter;
        var incoming = this.relations[id].fromIssue.relations;
        for (iter = 0; iter < incoming.outgoing.length; ++iter)
        {
            if (incoming.outgoing[iter].id === id)
            {
                delete incoming.outgoing[iter];
                incoming.outgoing.splice(iter, 1);
                break;
            }
        }

        var outgoing = this.relations[id].toIssue.relations;
        for (iter = 0; iter < outgoing.incoming.length; ++iter)
        {
            if (outgoing.incoming[iter].id === id)
            {
                delete outgoing.incoming[iter];
                outgoing.incoming.splice(iter, 1);
                break;
            }
        }

        delete this.relations[id];
    }
};

PlanningChart.prototype.addBackground = function ()
{
    // Add background to enable panning
    this.bg = this.paper.rect(-10000, -10000, 20000, 20000, 5);
    this.bg.attr('fill', '#fff');
    this.bg.toBack();

    var chart = this;

    this.bg.drag(function (dx, dy)
    {
        var w = chart.dayWidth();
        var h = chart.options.issue_height;
        var nDays = Math.round(dx / -w);
        var nIssues = Math.round(dy / -h);

        var new_x = chart.viewbox.sx + nDays * w;
        var new_y = chart.viewbox.sy + nIssues * h;
        if (new_x != chart.viewbox.x || new_y != chart.viewbox.y)
            chart.setViewBox(new_x, new_y, chart.viewbox.w, chart.viewbox.h);
    }, function ()
    {
        chart.viewbox.sx = chart.viewbox.x;
        chart.viewbox.sy = chart.viewbox.y;
    });
};

PlanningChart.prototype.reset = function ()
{
    this.paper.clear();
    this.header = null;
    this.elements = {'issues': this.paper.set(), 'relations': this.paper.set(), 'issue_texts': this.paper.set(), 'parent_links': this.paper.set(), 'progress_bars': this.paper.set()};
    this.addBackground();
    this.drawHeader();
    this.issues = {'length': 0};
    this.relations = {'length': 0};
};

PlanningChart.prototype.drawHeader = function (start_date, end_date)
{
    if (this.header)
    {
        this.header.remove();
        this.header = null;
    }

    var base = this.base_date;
    var dw = this.dayWidth();

    var lines = this.paper.set();
    var texts = this.paper.set();
    this.header = this.paper.set();

    var nDays = end_date ? end_date.subtract(start_date).days() : Math.round(1.5 * this.viewbox.w / dw);
    var startDay = start_date ? start_date.subtract(base).days() : Math.round(-0.75 * this.viewbox.w / dw);
    startDay -= startDay % 4;
    var endDay = startDay + nDays;

    var days, x, y; // Storage for header parameters
    for (var w = startDay; w <= endDay; w += 2)
    {
        var cur = new Date(base.getTime() + w * 86400000);
        cur.resetTime();

        days = cur.subtract(base).days();
        x = this.options.margin.x + days * dw;
        y = this.viewbox.y;

        var max_x = Math.max(this.geometry_limits.x[1] + 1000, 100000);
        var line = this.paper.path("M" + x + "," + 0 + "L" + x + "," + max_x);
        line.attr('title', this.formatDate(cur));
        lines.push(line);

        if ((dw >= 20 && w % 4 === 0) || w % 8 === 0)
            texts.push(this.paper.text(x + 2, y + 10, this.formatDate(cur)));
    }

    this.header.push(lines);
    this.header.push(texts);
    lines.attr({
        'stroke': '#bbb',
        'stroke-width': 1
    });
    texts.attr({
        'font-size': 10,
        'font-weight': 100
    });

    // Draw today
    var t = rmp_getToday();
    days = t.subtract(base).days();
    x = this.options.margin.x + days * dw;
    var today = this.paper.path("M" + x + "," + -10000 + "L" + x + "," + 10000)
    .attr({
        'stroke': '#6f6',
        'stroke-width': 2,
        'title': 'Today: ' + this.formatDate(t)
    });

    this.header.push(today);

    // Draw focus date
    x = this.options.margin.x;
    var focus = this.paper.path("M" + x + "," + -10000 + "L" + x + "," + 10000)
    .attr({
        'stroke': '#44f',
        'stroke-width': 2,
        'title': 'Focus: ' + this.formatDate(base)
    });
    this.header.push(focus);

    if (this.elements)
    {
        if (this.elements.relations)
            this.elements.relations.toFront();
        if (this.elements.issues)
            this.elements.issues.toFront();
        if (this.elements.issue_texts)
            this.elements.issue_texts.toFront();
        if (this.elements.progress_bars)
            this.elements.progress_bars.toFront();
    }
};

PlanningChart.prototype.draw = function (redraw)
{
    // Draw the date header
    this.drawHeader();

    // Add children to their parents etc
    this.analyzeHierarchy();

    // Sort issues by parent and start date
    this.sortIssues();

    // Start drawing all issues
    this.drawIssues();

    // Draw the issue list
    this.drawList();
};

PlanningChart.prototype.drawIssues = function ()
{
    var w = this.chart_area.width();
    var h = this.chart_area.height();
    this.geometry_limits = {'x': [-w / 2, -w / 2], 'y': [0, 0]};
    var ikeys = Object.keys(this.issues);
    var iter; // Array iterator
    var k; // Key iterator
    for (iter = 0; iter < ikeys.length; ++iter)
    {
        k = ikeys[iter];
        if (k == "length")
            continue;
        this.issues[k].update();
    }

    var rkeys = Object.keys(this.relations);
    for (iter = 0; iter < rkeys.length; ++iter)
    {
        k = rkeys[iter];
        if (k == "length")
            continue;
        this.relations[k].draw();
    }

    // Update the geometry limits to have space for 3 more issues and three more weeks on each side
    this.geometry_limits.y[1] += (this.options.issue_height + this.options.spacing.y) * 3;
    this.geometry_limits.x[0] -= (this.dayWidth() * 21);
    this.geometry_limits.x[1] += (this.dayWidth() * 21);
};


PlanningChart.prototype.drawList = function ()
{
    // Destroy UI-resizable before removing all HTML
    if (this.issue_list.data('ui-resizable'))
        this.issue_list.resizable('destroy');

    this.issue_list.html('');

    var ikeys = Object.keys(this.issues);
    var iter;
    var issue;
    var pissue;
    var x;
    var y;

    var indent = 2;
    var level = 1;
    var text;
    var caption;

    var $ = jQuery;

    var table = $('<div class="table"></div>').addClass('planning_list_table');
    var row_container = $('<div></div>').addClass('planning_list_row_container');
    var s = this.getScale();
    // TODO: Fix / find out why?
    var weirdness_offset = -15;
    row_container.css('height', (this.geometry_limits.y[1] + 15) * s[1]);
    
    var cmp = function (a, b) {
        return a.idx - b.idx;
    };

    var list = [];

    for (iter = 0; iter < ikeys.length; ++iter)
        if (ikeys[iter] !== "length")
            list.push(this.issues[ikeys[iter]]);
    list.sort(cmp);

    var scale = this.getScale();
    var row_height = this.options.issue_height + this.options.spacing.y;
    var dom_row_height = row_height * scale[1];
    var font_size = Math.min(dom_row_height * 0.5, 14);

    for (iter = 0; iter < list.length; ++iter)
    {
        issue = list[iter];
        level = 0;
        pissue = issue;
        while (pissue.parent_issue)
        {
            ++level;
            pissue = pissue.parent_issue;
        }
       
        issue.list_row = $('<div class="planning_issue"></div>')
            .data('issue', issue);

        var n = issue.name;
        if (n.length > 30)
            n = n.substr(0, 27) + "...";
        
        issue.list_row.append(
            $('<div class="planning_issue_column issue_id"></div>').text(issue.id),
            $('<div class="planning_issue_column issue_tracker"></div>').text(issue.tracker),
            $('<div class="planning_issue_column issue_name"></div>').html(n),
            $('<div class="planning_issue_column issue_start"></div>').text(this.formatDate(issue.start_date)),
            $('<div class="planning_issue_column issue_due"></div>').text(this.formatDate(issue.due_date))
        );
        issue.list_row.children().css({
            'height': dom_row_height - 3,
            'line-height': dom_row_height - 3 + 'px',
            'font-size': font_size + 'px',
            'text-decoration': issue.closed ? 'line-through' : 'none'
        });

        issue.list_row.css({
            left: 0,
            top: (this.options.margin.y - (this.options.spacing.y / 2) + row_height * issue.idx) * scale[1],
            height: dom_row_height
        });

        // Set bold for milestones and parent tasks
        var issue_name = issue.list_row.children('.issue_name');
        if (!issue.leaf || issue.milestone)
            issue_name.css('font-weight', 'bold');

        var expand_button = $('<i>&nbsp;</i>').addClass('ion-android-dropdown planning_collapse_button');
        if (issue.children.length)
            issue_name.prepend(expand_button.clone());
        else
            level += 2;

        issue_name.prepend(Array(level * indent + 1).join("&nbsp;"));

        
        row_container.append(issue.list_row);
    }
    table.append(row_container);
    this.issue_list.append(table);

    table.on('click', '.planning_collapse_button', function (e)
    {
        var icon = jQuery(this);
        var row = jQuery(this).closest('.planning_issue');
        var collapsed = row.hasClass('collapsed');
        var issue = row.data('issue');
        issue.collapse(!collapsed);
        chart.sortIssues();
        chart.drawIssues();

        var others = row.nextAll('.planning_issue');
        var row_height = issue.chart.options.issue_height + issue.chart.options.spacing.y;
        var scale = issue.chart.getScale();
        var dom_row_height = row_height * scale[1];
        others.each(function ()
        {
            var child = jQuery(this).data('issue');
            if (!issue.visible)
                return;

            jQuery(this).css('top', (child.chart.options.margin.y - (child.chart.options.spacing.y / 2) + row_height * child.idx) * scale[1]);
        });

        row.toggleClass('collapsed');
        icon.toggleClass('ion-android-dropdown').toggleClass('ion-arrow-right-b');
    });

    // Synchronize scrolling
    var chart = this;
    var listMouseFn = function (evt)
    {
        if (this.data('ignore'))
        {
            this.data('ignore', null);
            return;
        }
        this.data('to', null); 
        var scale = chart.getScale();
        chart.setViewBox(chart.viewbox.x, jQuery(this).scrollTop() / scale[1], chart.viewbox.w, chart.viewbox.h);
    }

    table.on('scroll', function (evt)
    {
        var list = jQuery(this);
        if (list.data('to'))
            clearTimeout(list.data('to'));
        list.data('to', setTimeout(function ()
        {
            listMouseFn.call(list);
        }, 50));
    });

    jQuery('.planning_issue').dblclick(function (evt)
    {
        var row = $(this);
        var issue = row.data('issue');
        var start_date = issue.start_date;

        if (start_date && start_date.getFullYear() != "1970")
        {
            var x_pos = start_date.subtract(issue.chart.base_date).days() * issue.chart.dayWidth();
            issue.chart.setViewBox(x_pos - issue.chart.viewbox.w / 2, issue.chart.viewbox.y, issue.chart.viewbox.w, issue.chart.viewbox.h);
        }
        row.parent().children('.ui-state-highlight').removeClass('ui-state-highlight');
        row.addClass('ui-state-highlight');
    });

    var list = this.issue_list;
    list.resizable({
        handles: "e",
        minWidth: 50,
        start: function (evt, ui)
        {
            var max = list.find('.planning_issue').first().outerWidth();
            list.resizable('option', 'maxWidth', max);
        }
    });

};

PlanningChart.prototype.getScale = function ()
{
    return [
        this.chart_area.innerWidth() / this.viewbox.w,
        this.chart_area.innerHeight() / this.viewbox.h
    ];
};

PlanningChart.prototype.clientToCanvas = function (x, y)
{
    var s = this.getScale();
    var cx = x / s[0] + this.viewbox.x;
    var cy = y / s[1] + this.viewbox.y;

    return [cx, cy];
};

PlanningChart.prototype.analyzeHierarchy = function ()
{
    // Reset and initialize all relation arrays
    var ikeys = Object.keys(this.issues);
    var pkeys = Object.keys(this.projects);
    var k; // Key iterator
    var iter; // Array iterator
    var prj; // Project reference

    for (iter = 0; iter < pkeys.length; ++iter)
    {
        if (pkeys[iter] == "length")
            continue;

        this.projects[pkeys[iter]].children = [];
        this.projects[pkeys[iter]].issues = [];
    }

    for (iter = 0; iter < pkeys.length; ++iter)
    {
        if (pkeys[iter] == "length")
            continue;

        prj = this.projects[pkeys[iter]];

        if (prj.parent_id)
        {
            this.projects[prj.parent_id].children.push(prj);
            prj.parent_project = this.projects[prj.parent_id];
        }
    }

    for (iter = 0; iter < ikeys.length; ++iter)
    {
        if (ikeys[iter] == "length")
            continue;

        this.issues[ikeys[iter]].children = [];
    }

    for (iter = 0; iter < ikeys.length; ++iter)
    {
        k = ikeys[iter];
        if (k == "length")
            continue;
        this.issues[k].relations.incoming = [];
        this.issues[k].relations.outgoing = [];

        if (this.issues[k].parent_id && this.issues[this.issues[k].parent_id])
        {
            this.issues[k].parent_issue = this.issues[this.issues[k].parent_id];
            this.issues[k].parent_issue.children.push(this.issues[k]);
        }

        if (this.issues[k].project_id && this.projects[this.issues[k].project_id])
        {
            this.projects[this.issues[k].project_id].children.push(this.issues[k]);
            this.issues[k].project = this.projects[this.issues[k].project_id];
        }
    }

    // Add all relations to the corresponding issues
    var rkeys = Object.keys(this.relations);
    for (iter = 0; iter < rkeys.length; ++iter)
    {
        k = rkeys[iter];
        if (k == "length")
            continue;
        var relation = this.relations[k];
        if (!this.issues[relation.from])
            throw ("Issue " + relation.from + " is not available");
        if (!this.issues[relation.to])
            throw ("Issue " + relation.to + " is not available");
        relation.fromIssue = this.issues[relation.from];
        relation.toIssue = this.issues[relation.to];

        if (!relation.fromIssue.relations.outgoing)
            relation.fromIssue.relations.outgoing = [];
        if (!relation.toIssue.relations.incoming)
            relation.toIssue.relations.incoming = [];

        relation.fromIssue.relations.outgoing.push(relation);
        relation.toIssue.relations.incoming.push(relation);
    }
};

PlanningChart.prototype.markChanged = function (issue)
{
    this.changed[issue.id] = issue;
};

PlanningChart.prototype.saveChanged = function ()
{
    var issues = [];
    var ikeys = Object.keys(this.changed);
    for (var iter = 0; iter < ikeys.length; ++iter)
    {
        var id = ikeys[iter];
        issues.push({
            'id': id,
            'start_date': this.changed[id].start_date.toISODateString(),
            'due_date': this.changed[id].due_date.toISODateString()
        });
        this.changed[id].orig_data = null;
        this.changed[id].orig_geometry = null;
        delete this.changed[id].critical_path_determined;
    }

    if (this.options.on_move_issues)
        this.options.on_move_issues(issues);
    this.changed = {};
};

PlanningChart.prototype.updateIssue = function (id, response)
{
    var issue = this.issues[id];
    var k; // Key iterator
    if (!issue)
        return;

    var new_start_date = new Date(response[id].start_date);
    var new_due_date = new Date(response[id].due_date);
    new_start_date.resetTime();
    new_due_date.resetTime();

    var update = [false, false];
    if (new_start_date.getTime() != issue.start_date.getTime())
    {
        issue.start_date = new_start_date;
        update[0] = true;
    }
    if (new_due_date.getTime() != issue.due_date.getTime())
    {
        issue.due_date = new_due_date;
        update[1] = true;
    }
    if (update[0] || update[1])
    {
        issue.update();
        if (update[0])
        {
            for (k = 0; k < issue.relations.incoming.length; ++k)
                issue.relations.incoming[k].draw();
        }
        if (update[1])
        {
            for (k = 0; k < issue.relations.outgoing.length; ++k)
                issue.relations.outgoing[k].draw();
        }
    }
};

/* Project class definition */
function PlanningProject(data)
{
    this.id = data.id;
    this.name = data.name;
    this.identifier = data.identifier;
    this.parent_id = data.parent_id;
    this.children = [];
    this.issues = [];

    this.chart = null;
    this.idx = null;
}

PlanningProject.prototype.setChart = function (chart, idx)
{
    this.chart = chart;
    this.idx = idx;
}

/* Issue class definition */
function PlanningIssue(data)
{
    this.start_date = new Date(data.start_date);
    this.start_date.resetTime();
    if (this.start_date.getFullYear() == "1970")
        this.start_date = null;

    this.due_date = new Date(data.due_date);
    this.due_date.resetTime();
    if (this.due_date.getFullYear() == "1970")
        this.due_date = null;

    this.name = data.name;
    this.description = data.description;
    this.project = data.project_name;
    this.project_identifier = data.project_identifier;
    this.project_id = data.project_id;
    this.id = data.id;
    this.tracker = data.tracker;
    this.leaf = data.leaf ? true : false;
    this.closed = data.closed ? true : false;
    this.progress = data.percent_done;
    this.parent_id = data.parent;
    this.parent_issue = null;
    this.children = [];

    this.relations = {};
    this.chart = null;
    this.element = null;
    this.geometry = null;

    this.milestone = false;
    this.visible = true;
    this.collapsed = false;
}

PlanningIssue.prototype.setChart = function (chart, idx)
{
    this.chart = chart;
    this.idx = idx;
};

PlanningIssue.prototype.t = function ()
{
    return this.chart.t.apply(this.chart, arguments);
};

PlanningIssue.prototype.addRelation = function (relation)
{
    var iter; // Array iterator
    if (!this.relations)
        this.relations = {};
    if (relation.from == this.id)
    {
        if (!this.relations.outgoing)
            this.relations.outgoing = [];
        for (iter = 0; iter < this.relations.outgoing.length; ++iter)
        {
            if (this.relations.outgoing[iter].id == relation.id)
                return;
        }
        this.relations.outgoing.push(relation);
    }
    if (relation.to == this.id)
    {
        if (!this.relations.incoming)
            this.relations.incoming = [];
        for (iter = 0; iter < this.relations.incoming.length; ++iter)
        {
            if (this.relations.incoming[iter].id == relation.id)
                return;
        }
        this.relations.incoming.push(relation);
    }
    return this;
};

PlanningIssue.prototype.updateProgress = function ()
{
    if (!this.children.length)
        return;

    var children = this.children.length;
    var total_progress = 0;
    for (var i = 0; i < this.children.length; ++i)
        total_progress += this.children[i].progress;

    this.progress = Math.round(total_progress / children);
    if (this.element)
        this.drawProgressBar();

    if (this.parent_issue)
        this.parent_issue.updateProgress();

    return this;
}

PlanningIssue.prototype.setProgress = function (progress)
{
    progress = parseInt(progress, 10);
    if (progress < 0 || progress > 100)
        throw "Invalid value for progress: " + progress;
    this.progress = progress;

    if (this.element)
        this.drawProgressBar();

    if (this.parent_issue)
        this.parent_issue.updateProgress();

    return this;
};

PlanningIssue.prototype.getRelations = function ()
{
    if (!this.relations.incoming || !this.relations.outgoing)
        this.chart.analyzeHierarchy();

    var list = [];
    var iter; // Array iterator
    for (iter = 0; iter < this.relations.incoming.length; ++iter)
        list.push(this.relations.incoming[iter]);
    for (iter = 0; iter < this.relations.outgoing.length; ++iter)
        list.push(this.relations.outgoing[iter]);
    return list;
};

PlanningIssue.prototype.update = function ()
{
    if (!this.visible)
    {
        this.geometry = {x: 0, y: 0, w: 0, h: 0};
        return this;
    }

    // Recalculate geometry
    var base = this.chart.base_date;
    if (this.milestone)
    {
        var endDay = this.due_date !== null ? this.due_date.subtract(base).days() : rmp_getToday().subtract(base).days();
        this.geometry = {
            x: this.chart.options.margin.x + (endDay * this.chart.dayWidth()),
            y: this.chart.options.margin.y + this.idx * (this.chart.options.issue_height + this.chart.options.spacing.y),
            height: this.chart.options.issue_height,
            width: this.chart.dayWidth()
        };
    }
    else
    {
        // Take care of null dates
        var start_date = this.start_date;
        var due_date = this.due_date;
        if (start_date === null && due_date === null)
        {
            start_date = rmp_getToday();
            due_date = start_date.add(DateInterval.createDays(1));
        }
        else if (start_date === null && due_date !== null)
        {
            start_date = due_date.subtract(DateInterval.createDays(1));
        }
        else if (start_date !== null && due_date === null)
        {
            due_date = start_date.add(DateInterval.createDays(1));
        }

        var startDay = start_date.subtract(base).days();
        var nDays = Math.max(1, due_date.subtract(start_date).days());
        this.geometry = {
            x: this.chart.options.margin.x + (startDay * this.chart.dayWidth()),
            y: this.chart.options.margin.y + this.idx * (this.chart.options.issue_height + this.chart.options.spacing.y),
            height: this.chart.options.issue_height,
            width: this.chart.dayWidth() * nDays
        };
    }

    this.chart.geometry_limits.x[0] = Math.min(this.geometry.x - this.chart.options.spacing.x, this.chart.geometry_limits.x[0]);
    this.chart.geometry_limits.x[1] = Math.max(this.geometry.x - this.chart.options.spacing.x + this.geometry.width + this.chart.options.spacing.x, this.chart.geometry_limits.x[1]);
    this.chart.geometry_limits.y[1] = Math.max(this.geometry.y + this.geometry.height + 2 * this.chart.options.spacing.y, this.chart.geometry_limits.y[1]);

    return this.draw();
};

PlanningIssue.prototype.backup = function ()
{
    if (!this.orig_geometry)
        this.orig_geometry = jQuery.extend({}, this.geometry);
    if (!this.orig_data)
    {
        this.orig_data = {'start_date': this.start_date, 'due_date': this.due_date};
        if (!this.orig_data.start_date || this.orig_data.start_date.getFullYear() == "1970")
            this.orig_data.start_date = rmp_getToday();
        if (!this.orig_data.due_date || this.orig_data.due_date.getFullYear() == "1970")
            this.orig_data.due_date = this.orig_data.start_date.add(DateInterval.createDays(1));
    }
    this.chart.markChanged(this);
};

PlanningIssue.prototype.move = function (arg1, arg2)
{
    if (!this.chart.move_time)
        this.chart.move_time = new Date();

    // This issue has already moved in this move chain, so do not move it again
    if (this.move_time && this.move_time.getTime() == this.chart.move_time.getTime())
        return;

    // Store the move time to avoid moving this issue again
    this.move_time = this.chart.move_time;

    if (arg1 instanceof DateInterval && !arg2)
    {
        // Nothing to do
        if (!arg1.ms)
            return;

        this.start_date = this.start_date.add(arg1);
        if (!this.due_date || this.due_date.getFullYear() == "1970")
            this.due_date = this.start_date.add(DateInterval.createDays(1));
        else
            this.due_date = this.due_date.add(arg1);
    }
    else if (arg1 instanceof Date && arg2 instanceof Date)
    {
        if (arg1 >= arg2)
            throw "Start date is equal to or later than due date";

        if (this.start_date.getTime() == arg1.getTime() && this.due_date.getTime() == arg2.getTime())
            return;

        this.start_date = arg1;
        this.due_date = arg2;
    }
    else
    {
        throw "Invalid arguments: arg1: " + arg1 + ", arg2: " + arg2;
    }

    // Make sure the element is marked as changed
    this.backup();
    this.update();

    // Update dependent issues
    var iter;
    var delay; // Delay for precedes relations
    var target; // Target date
    var r; // Relation reference
    for (iter = 0; iter < this.relations.outgoing.length; ++iter)
    {
        r = this.relations.outgoing[iter];
        switch (r.type)
        {
            case "blocks":
                if (r.toIssue.due_date < this.due_date)
                {
                    delay = this.due_date.subtract(r.toIssue.due_date);
                    r.toIssue.move(delay);
                }
                break;
            case "precedes":
                target = this.due_date.add(DateInterval.createDays(r.delay + 1));
                delay = target.subtract(r.toIssue.start_date);
                r.toIssue.move(delay);
                break;
        }
        r.draw();
    }

    for (iter = 0; iter < this.relations.incoming.length; ++iter)
    {
        r = this.relations.incoming[iter];
        switch (r.type)
        {
            case "blocks":
                if (this.due_date < r.fromIssue.due_date)
                {
                    delay = this.due_date.subtract(r.fromIssue.due_date);
                    r.fromIssue.move(delay);
                }
                break;
            case "precedes":
                target = this.start_date.subtract(DateInterval.createDays(r.delay + 1));
                delay = target.subtract(r.fromIssue.due_date);
                r.fromIssue.move(delay);
                break;
        }
        r.draw();
    }

    // Check parent relations
    this.checkParents();

    // If parent was moved, children should move by the same amount
    if (arg1 instanceof DateInterval)
    {
        for (iter = 0; iter < this.children.length; ++iter)
            this.children[iter].move(arg1);
    }
};

PlanningIssue.prototype.calculateLimits = function (direction, ctime)
{
    var start_element = false;
    if (!ctime)
    {
        ctime = new Date();
        start_element = true;
    }
    else if (this.critical_path_time && this.critical_path_time >= ctime)
    {
        return;
    }

    this.critical_path_time = ctime;
    this.min_start_date = null;
    this.max_start_date = null;
    this.min_due_date = null;
    this.max_due_date = null;

    var duration = this.due_date.subtract(this.start_date);

    // Check parent issue critical path
    var limit; // Limit date storage
    if (this.parent_issue)
    {
        this.parent_issue.calculateLimits(direction, ctime);
        if (direction <= 0)
        {
            limit = this.parent_issue.min_start_date;
            if (
                limit !== null &&
                (
                    this.min_start_date === null ||
                    limit > this.min_start_date
                )
            )
            {
                this.min_start_date = limit;
            }
        }
        if (direction >= 0)
        {
            limit = this.parent_issue.max_due_date;
            if (
                limit !== null &&
                (
                    this.max_due_date === null ||
                    limit < this.max_due_date
                )
            )
            {
                this.max_due_date = limit;
            }
        }
    }

    // Check related tasks
    var types = Object.keys(this.relations);
    var iter; // Array iterator
    var k; // Key iterator
    var r; // Relation reference
    for (iter = 0; iter < types.length; ++iter)
    {
        var type = types[iter];

        if (direction > 0 && type == "incoming")
            continue;
        if (direction < 0 && type == "outgoing")
            continue;

        for (k = 0; k < this.relations[type].length; ++k)
        {
            // Update min_start_date
            r = this.relations[type][k];
            switch (r.type)
            {
                case 'relates':
                case 'copied_to':
                case 'duplicates':
                    continue;
                case 'blocks':
                    // End-to-end relation: the from-issue must end before
                    // the to-issue can end
                    if (type == "incoming")
                    {
                        r.fromIssue.calculateLimits(-1, ctime);
                        if (r.fromIssue.min_due_date !== null)
                        {
                            var own_min_start = r.fromIssue.min_due_date.subtract(duration);
                            if (
                                this.min_start_date === null ||
                                own_min_start > this.min_start_date
                            )
                            {
                                this.min_start_date = own_min_start;
                            }
                        }
                    }
                    else
                    {
                        r.toIssue.calculateLimits(1, ctime);
                        if (
                            r.toIssue.max_due_date !== null &&
                            (
                                this.max_due_date === null ||
                                r.toIssue.max_due_date < this.max_due_date
                            )
                        )
                        {
                            this.max_due_date = r.toIssue.max_due_date;
                        }
                    }
                    break;
                case 'precedes':
                    // End-to-start relation: the from-issue must end before
                    // the to-issue can begin
                    if (type == "incoming")
                    {
                        r.fromIssue.calculateLimits(-1, ctime);
                        limit = r.fromIssue.min_due_date;
                        if (limit && r.delay !== null)
                        {
                            // Enforce delay when set
                            limit = new Date(limit.getTime());
                            limit = limit.add(DateInterval.createDays(r.delay + 1));
                        }
                        if (
                            limit !== null &&
                            (
                                this.min_start_date === null ||
                                limit > this.min_start_date
                            )
                        )
                        {
                            this.min_start_date = limit;
                        }
                    }
                    else
                    {
                        r.toIssue.calculateLimits(1, ctime);
                        limit = r.toIssue.max_start_date;
                        if (limit && r.delay !== null)
                        {
                            // Enforce delay when set
                            limit = new Date(limit.getTime());
                            limit = limit.add(DateInterval.createDays(-r.delay - 1));
                        }
                        if (
                            limit !== null &&
                            (
                                this.max_due_date === null ||
                                limit < this.max_due_date
                            )
                        )
                        {
                            this.max_due_date = limit;
                        }
                    }
                    break;
            }
        }
    }

    if (direction)
    {
        // If moving the endpoint is not allowed, check
        // if this is an endpoint and update accordingly
        if (!this.min_start_date)
        {
            // If this issue has a parent, this issue may at least move to the beginning of it's parent
            if (this.parent_issue && this.parent_issue.start_date)
                this.min_start_date = this.parent_issue.start_date;
            else
                this.min_start_date = this.start_date;
        }
        if (!this.max_due_date)
        {
            if (this.parent_issue && this.parent_issue.due_date)
                this.max_due_date = this.parent_issue.due_date;
            else
                this.max_due_date = this.due_date;
        }
    }

    if (this.min_start_date)
    {
        this.min_due_date = this.min_start_date.add(duration);
    }
    if (this.max_due_date)
    {
        this.max_start_date = this.max_due_date.subtract(duration);
    }

    if (start_element)
    {
        if (this.critical_lines)
        {
            this.critical_lines.remove();
        }

        // Show critical path lines for first element
        var min_date = this.min_start_date;
        var max_date = this.max_due_date;

        this.chart.paper.setStart();
        if (min_date !== null)
        {
            var min_x = Math.round(this.chart.options.margin.x + (min_date.subtract(this.chart.base_date).days() * this.chart.dayWidth()));
            var path1 = "M" + min_x + ",0L" + min_x + ",10000";
            this.chart.paper.path(path1);
        }
        if (max_date !== null)
        {
            var max_x = Math.round(this.chart.options.margin.x + (max_date.subtract(this.chart.base_date).days() * this.chart.dayWidth()));
            var path2 = "M" + max_x + ",0L" + max_x + ",1000";
            this.chart.paper.path(path2);
        }
        this.critical_lines = this.chart.paper.setFinish().attr('stroke', '#f00');
    }
};

PlanningIssue.prototype.checkParents = function ()
{
    // Check parents to stretch along
    var cur_child = this;
    var cur_parent = this.parent_issue;
    var k; // Key iterator
    while (cur_parent)
    {
        var cur_start_date = null;
        var cur_due_date = null;
        for (k = 0; k < cur_parent.children.length; ++k)
        {
            if (!cur_start_date || cur_start_date > cur_parent.children[k].start_date)
                cur_start_date = cur_parent.children[k].start_date;
            if (!cur_due_date || cur_due_date < cur_parent.children[k].due_date)
                cur_due_date = cur_parent.children[k].due_date;
        }

        // Update the parent to the new correct size
        cur_parent.move(cur_start_date, cur_due_date);

        // Traverse the tree to the root
        cur_child = cur_parent;
        cur_parent = cur_child.parent_issue;
    }
};

PlanningChart.prototype.eventToCanvas = function (e, mX, mY)
{
    // Get scale of canvas in container
    var s = this.getScale();

    // Get position of container
    var cp = this.chart_area.position();

    // Get margin of container, in integral pixels
    var mx = parseInt(this.chart_area.css('margin-left'), 10);
    var my = parseInt(this.chart_area.css('margin-top'), 10);

    var st = jQuery(window).scrollTop();
    var sl = jQuery(window).scrollLeft();

    // Determine position of mouse cursor
    var x = Math.round((e.clientX + sl - cp.left - mx) / s[0] + this.viewbox.x);
    var y = Math.round((e.clientY + st - cp.top - my) / s[1] + this.viewbox.y);
    return [x, y];
};

PlanningIssue.prototype.closeTooltip = function (e)
{
    var tt = jQuery('.planning_tooltip');
    if (!tt.data('timeout'))
    {
        var to = setTimeout(function ()
        {
            tt.fadeOut(function ()
            {
                jQuery(this).remove();
            });
        }, 1000);
        tt.data('timeout', to);
    }
};

PlanningIssue.prototype.changeCursor = function (e, mouseX, mouseY)
{
    if (this.dragging || this.chart.mode == "drag")
        return;

    if (!this.leaf)
    {
        this.element.attr('cursor', 'move');
        this.text.attr('cursor', 'move');
        this.showTooltip();
        return;
    }

    if (this.chart.relating)
    {
        var allowed = true;
        if (this.chart.relating.from)
        {
            var t = this.chart.relating.type;

            var source = this.chart.issues[this.chart.relating.from];
            if (t == "blocks" && this.due_date < source.due_date)
                allowed = false;
            else if (t == "precedes" && this.start_date < source.due_date)
                allowed = false;
            if (this.id == source.id)
                allowed = false;
        }
        if (allowed)
        {
            this.element.attr('cursor', 'cell');
            this.text.attr('cursor', 'cell');
        }
        else
        {
            this.element.attr('cursor', 'not-allowed');
            this.text.attr('cursor', 'not-allowed');
        }
        return;
    }

    var pos = this.chart.eventToCanvas(e, mouseX, mouseY);
    var x = pos[0];
    var y = pos[1];

    var relX = x - this.element.attr('x');
    var relY = y - this.element.attr('y');

    if (!this.milestone && relX <= this.chart.options.issue_resize_border)
    {
        this.element.attr('cursor', 'w-resize');
        this.text.attr('cursor', 'w-resize');
    }
    else if (!this.milestone && relX >= this.element.attr('width') - this.chart.options.issue_resize_border)
    {
        this.element.attr('cursor', 'e-resize');
        this.text.attr('cursor', 'e-resize');
    }
    else
    {
        this.element.attr('cursor', 'move');
        this.text.attr('cursor', 'move');
        this.showTooltip();
    }
}

PlanningIssue.prototype.click = function (e)
{
    var chart = this.chart;
    if (!chart.relating)
        return;

    if (!chart.relating.from)
    {
        chart.relating.from = this.id;
        return;
    }

    var source = chart.issues[this.chart.relating.from];
    var type = chart.relating.type;

    // Check if the target is acceptable
    if (type == "blocks" && this.due_date < source.due_date)
        return;
    if (type == "precedes" && this.start_date < source.due_date)
        return;
    if (this.id == source.id)
        return;

    for (var iter = 0; iter < source.relations.outgoing.length; ++iter)
    {
        if (source.relations.outgoing[iter].to == this.id)
        {
            alert(chart.t('relation_exists', type, '#' + source.id, '#' + this.id));
            jQuery('#redmine_planning_move_button').click();
            return;
        }
    }
    chart.relating.to = this.id;

    var new_relation = this.chart.relating;
    new_relation.id = this.chart.id_counter++;
    new_relation.delay = null;
    if (new_relation.type == "precedes")
        new_relation.delay = this.start_date.subtract(source.due_date).days() - 1;
    chart.relating = null;

    var relation = new PlanningIssueRelation(new_relation, chart);

    jQuery('#redmine_planning_move_button').click();
    if (this.chart.options.on_create_relation)
        this.chart.options.on_create_relation(relation);
    else
        this.chart.draw();
};

PlanningIssue.prototype.dragStart = function (x, y, e)
{
    if (this.chart.relating || this.chart.deleting)
        return;

    if (this.chart.mode !== "move")
        return;

    var right;
    if (e.which)
        right = e.which === 3;
    else
        right = e.button === 2;
    if (right)
    {
        // Show context menu
        return;
        //var $ = jQuery;
        //var id = "planning_anchor_" + this.chart.id_counter++;
        //var anchor = $('<div></div>')
        //    .attr('id', id)
        //    .addClass('planning_context_menu')
        //    .css({
        //        'position': 'absolute',
        //        'top': y,
        //        'left': x,
        //    })
        //    .on('contextmenu', function (e)
        //    {
        //        e.stopPropagation();
        //        return false;
        //    })
        //    .html('&nbsp;')
        //    .appendTo('body');

        //$(document).contextmenu({
        //    delegate: '#' + id,
        //    autoTrigger: false,
        //    show: {effect: 'show', 'duration': 1},
        //    menu: [
        //        {
        //            title: 'Copy issue',
        //            uiIcon: 'ui-icon-copy',
        //            cmd: 'copy'
        //        },
        //        {
        //            title: 'Remove issue',
        //            uiIcon: 'ui-icon-scissors',
        //            cmd: 'remove'
        //        }
        //    ],
        //    open: function (e)
        //    {
        //        $(document).contextmenu('option', 'close', function (e) {
        //           anchor.remove();
        //           $(document).contextmenu("destroy");
        //        });
        //    },
        //    select: function (e, ui)
        //    {
        //        //console.log(ui.cmd);
        //    }
        //});
        //// We have to do this in a callback to avoid the window being closed
        //// again. Seems like a bug in jquery-ui-contextmenu.
        //setTimeout(function () {
        //    $(document).contextmenu('open', anchor);
        //}, 10);

        //return;
    }

    jQuery('.planning_tooltip').remove();

    var cursor = this.elem

    this.dragging = true;
    this.chart.mode = "drag";
    this.backup();
    this.getRelations();
    this.calculateLimits(0);
};

PlanningIssue.prototype.dragMove = function (dx, dy, x, y, e)
{
    // Ignore non-left button drag
    if ((e.which & 1) === 0)
    {
        return;
    }

    if (this.chart.relating || this.chart.deleting)
        return;

    if (!this.dragging)
        return;

    var chart = this.chart;
    var s = this.chart.getScale();
    dx /= s[0];
    dy /= s[1];

    var cursor = this.element.attr('cursor');
    var dDays = Math.round(dx / chart.dayWidth());
    var movement = DateInterval.createDays(dDays);
    var one_day = DateInterval.createDays(1);
    var dWidth = dDays * this.chart.dayWidth();
    var direction = 1;

    var tt_date;
    if (cursor == "move")
        tt_date = "<strong>" + chart.t('move_to') + ":</strong> " + this.chart.formatDate(this.orig_data.start_date.add(movement));
    else if (cursor == 'w-resize')
        tt_date = "<strong>" + chart.t('start_date') + ":</strong> " + this.chart.formatDate(this.orig_data.start_date.add(movement));
    else if (cursor == 'e-resize')
        tt_date = "<strong>" + chart.t('due_date') + ":</strong> " + this.chart.formatDate(this.orig_data.due_date.add(movement));

    var tt = jQuery('.planning_date_tooltip');
    if (!tt.length)
    {
        tt = jQuery('<div></div>')
            .addClass('planning_date_tooltip')
            .appendTo('body');
    }

    tt.css({
        'left': x,
        'top': y + 15
    });
    tt.html(tt_date);

    var new_start = this.start_date;
    var new_due = this.due_date;
    var resize = false;
    switch (cursor)
    {
        case 'w-resize':
            new_start = this.orig_data.start_date.add(movement);
            if (new_start >= this.due_date)
                new_start = this.due_date.subtract(one_day);
            resize = true;
            break;
        case 'e-resize':
            new_due = this.orig_data.due_date.add(movement);
            if (new_due <= this.start_date)
                new_due = this.start_date.add(one_day);
            resize = true;
            break;
        case 'move':
            new_start = this.orig_data.start_date.add(movement);
            new_due = this.orig_data.due_date.add(movement);
    }

    if (this.min_start_date !== null && new_start < this.min_start_date)
    {
        new_start = this.min_start_date;
        if (!resize)
            new_due = this.min_due_date;
    }
    if (this.max_due_date !== null && new_due > this.max_due_date)
    {
        new_due = this.max_due_date;
        if (!resize)
            new_start = this.max_start_date;
    }

    if (resize)
    {
        // When resizing, the critical path analysis is unreliable so we need to
        // do it again after each adjustment
        this.calculateLimits(0);

        // Perform the actual resize
        this.move(new_start, new_due);
    }
    else
    {
        // Calculate the actual movement
        movement = new_start.subtract(this.start_date);

        // Perform the actual move
        this.move(movement);
    }

    // Delete movement tracker
    delete this.chart.move_time;
};

PlanningIssue.prototype.dragEnd = function (e)
{
    // Ignore right button drag
    if (e.button !== 0)
        return;

    if (this.chart.relating || this.chart.deleting)
        return;

    if (!this.dragging)
        return;

    jQuery('.planning_date_tooltip').remove();

    this.dragging = false;
    this.chart.mode = "move";
    this.chart.saveChanged();
    if (this.critical_lines)
    {
        this.critical_lines.remove();
        delete this.critical_lines;
    }
};

PlanningIssue.prototype.progressStart = function (e)
{
    var right;
    if (e.which)
        right = e.which === 3;
    else
        right = e.button === 2;

    if (right)
        return;

    // The progress of a parent task depends on its children
    if (this.children.length)
        return;

    // Milestones do not have progress (visualized)
    if (this.milestone.length)
        return;

    this.orig_progress = this.progress;
    this.mode = "progress";
}

PlanningIssue.prototype.progressMove = function (dx, dy, x, y, e)
{
    if (this.mode !== "progress")
        return;

    var s = this.chart.getScale();
    dx = dx / s[0];
    dy = dy / s[1];

    var pd_minWidth = this.chart.options.issue_resize_border;
    var pd_maxWidth = this.geometry.width - (this.chart.options.issue_resize_border * 2);
    var pd_perPercent = (pd_maxWidth - pd_minWidth) / 100;

    var orig_width = Math.round(pd_minWidth + pd_perPercent * this.orig_progress)
    var new_width = rmp_clamp(orig_width + dx, pd_minWidth, pd_maxWidth);
    var new_progress = (new_width - pd_minWidth) / pd_perPercent;

    this.setProgress(new_progress);
    this.drawProgressBar();
}

PlanningIssue.prototype.progressEnd = function(e)
{
    if (this.chart.options.on_set_progress)
        this.chart.options.on_set_progress.call(this, this.progress, this.orig_progress);

    delete this.orig_progress;
    this.mode = "move";
}

PlanningIssue.prototype.updateRelations = function ()
{
    var types = Object.keys(this.relations);
    var k; // Key iterator
    for (var iter = 0; iter < types.length; ++iter)
    {
        var t = types[iter];
        for (k = 0; k < this.relations[t].length; ++k)
            this.relations[t][k].draw();
    }
};

PlanningIssue.prototype.setVisible = function (visible)
{
    if (!visible)
    {
        if (this.element)
        {
            this.chart.elements.issues.exclude(this.element);
            this.element.remove();
            delete this.element;
        }
        if (this.text)
        {
            this.chart.elements.issue_texts.exclude(this.text);
            this.text.remove();
            delete this.text;
        }
        if (this.parent_link)
        {
            this.chart.elements.parent_links.exclude(this.parent_link);
            this.parent_link.remove();
            delete this.parent_link;
        }
        if (this.progress_bar)
        {
            this.chart.elements.parent_links.exclude(this.progress_bar);
            this.progress_bar.remove();
            delete this.progress_bar;
        }
        this.visible = false;
        delete this.idx;

        this.list_row.hide();
    }
    else
    {
        this.visible = true;
        this.list_row.show();
        this.update();
    }
}

PlanningIssue.prototype.collapse = function (collapse)
{
    for (var iter = 0; iter < this.children.length; ++iter)
    {
        this.children[iter].collapse(collapse);
        this.children[iter].setVisible(!collapse);
    }

    if (this.children.length)
        this.collapsed = collapse;

    return this;
};

/**
 * Draw the issue on the chart
 *
 * @return PlanningIssue Provides fluent interface
 */
PlanningIssue.prototype.draw = function ()
{
    // If no geometry has been calcalated, do so and return to avoid recursion
    if (!this.visible)
        return this;

    if (!this.geometry)
        return this.update();

    var sx = this.geometry.x;
    var ex = this.geometry.x + this.geometry.width;
    var sy = this.geometry.y;
    var ey = this.geometry.y + this.geometry.height;
    if (
        (sx > this.chart.viewbox.x + this.chart.viewbox.w) ||
        (ex < this.chart.viewbox.x) ||
        (sy > this.chart.viewbox.y + this.chart.viewbox.h) ||
        (ey < this.chart.viewbox.y + this.chart.options.margin.y)
    )
    {
        if (this.element)
        {
            this.chart.elements.issues.exclude(this.element);
            this.element.remove();
            delete this.element;
        }
        if (this.text)
        {
            this.chart.elements.issue_texts.exclude(this.text);
            this.text.remove();
            delete this.text;
        }
        if (this.progress_bar)
        {
            this.chart.elements.progress_bars.exclude(this.progress_bar);
            this.progress_bar.remove();
            delete this.progress_bar;
        }
        if (this.parent_link)
        {
            this.chart.elements.parent_links.exclude(this.parent_link);
            this.parent_link.remove();
            delete this.parent_link;
        }
        return;
    }

    var type;
    if (!this.parent && this.children.length)
        type = "root";
    else if (this.parent && this.children.length)
        type = "branch";
    else if (this.milestone)
        type = "milestone";
    else
        type = "leaf";
    if (!this.element)
    {
        var fill = this.chart.getTrackerAttrib(this.tracker, 'fill_color');
        if (this.milestone)
        {
            this.element = this.chart.paper.path(
                "M" + this.geometry.x + "," + (this.geometry.y + (this.geometry.height / 2)) +
                "L" + (this.geometry.x + (this.geometry.width / 2)) + "," + this.geometry.y +
                "L" + (this.geometry.x + this.geometry.width) + "," + (this.geometry.y + this.geometry.height / 2) +
                "L" + (this.geometry.x + (this.geometry.width / 2)) + "," + (this.geometry.y + this.geometry.height) +
                "L" + this.geometry.x + "," + (this.geometry.y + (this.geometry.height / 2))
            );
            if (this.chart.options.type[type].fill)
                fill = this.chart.options.type[type].fill;
        }
        else
        {
            this.element = this.chart.paper.rect(
                this.geometry.x,
                this.geometry.y,
                this.geometry.width,
                this.geometry.height,
                this.chart.options.type[type].radius
            );
        }

        this.element.toFront();
        this.element.attr({
            'stroke': this.chart.options.type[type].stroke,
            'stroke-width': this.chart.options.type[type].width,
            'fill': fill
        });

        this.element.mousemove(this.changeCursor, this);
        this.element.mouseout(this.closeTooltip, this);
        this.element.drag(this.dragMove, this.dragStart, this.dragEnd, this, this, this);
        this.element.click(this.click, this);

        this.chart.elements.issues.push(this.element);
    }
    else
    {
        if (this.milestone)
        {
            this.element.attr('path',
                "M" + this.geometry.x + "," + (this.geometry.y + (this.geometry.height / 2)) +
                "L" + (this.geometry.x + (this.geometry.width / 2)) + "," + this.geometry.y +
                "L" + (this.geometry.x + this.geometry.width) + "," + (this.geometry.y + this.geometry.height / 2) +
                "L" + (this.geometry.x + (this.geometry.width / 2)) + "," + (this.geometry.y + this.geometry.height) +
                "L" + this.geometry.x + "," + (this.geometry.y + (this.geometry.height / 2))
            );
        }
        else
        {
            this.element.attr(this.geometry);
        }
    }

    if (!this.milestone)
        this.drawProgressBar();
    var n; // Name holder
    var max_length; // Maximum size of name
    var text_color;
    var attribs;
    if (!this.text)
    {
        text_color = this.chart.getTrackerAttrib(this.tracker, 'text_color');
        n = this.tracker.substr(0, 1) + "#" + this.id + ": " + this.name;
        var available_font_height = Math.round(this.geometry.height * 0.6);
        max_length = this.geometry.width / (0.8 * available_font_height);
        if (n.length > max_length)
            n = n.substring(0, max_length) + "..";
        this.text = this.chart.paper.text(
            this.geometry.x + (this.geometry.width / 2),
            this.geometry.y + (this.geometry.height * 0.4),
            n
        );
        attribs = {
            'font-size': available_font_height + 'px',
            'cursor': 'move'
        };
        if (text_color != "#000" && text_color != "black" && text_color !=" #000000")
            attribs.fill = text_color;
        if (this.closed)
            attribs['text-decoration'] = "line-through";

        this.text.attr(attribs);
        this.text.toFront();
        this.text.mousemove(this.changeCursor, this);
        this.text.mouseout(this.closeTooltip, this);
        this.text.drag(this.dragMove, this.dragStart, this.dragEnd, this, this, this);
        this.text.click(this.click, this);

        this.chart.elements.issue_texts.push(this.text);
    }
    else
    {
        n = this.tracker.substr(0, 1) + "#" + this.id + ": " + this.name;
        max_length = this.geometry.width / 8;
        if (n.length > max_length)
            n = n.substring(0, max_length) + "...";
        this.text.attr({
            x: this.geometry.x + (this.geometry.width / 2),
            y: this.geometry.y + (this.geometry.height / 2),
            text: n
        });
    }

    if (this.parent_issue)
    {
        if (!this.parent_issue.geometry)
            this.parent_issue.update();

        if (this.parent_issue.geometry)
        {
            var x = Math.round(this.geometry.x + (this.geometry.width / 2.0));
            var start_y = this.parent_issue.geometry.y + this.parent_issue.geometry.height;
            var end_y = this.geometry.y;
            if (start_y > end_y)
            {
                start_y = this.geometry.y + this.geometry.height;
                end_y = this.parent_issue.geometry.y;
            }

            var path = "M" + x + "," + start_y + "L" + x + "," + end_y;
            if (!this.parent_link)
            {
                this.parent_link = this.chart.paper.path(path);
                this.parent_link.attr(this.chart.getRelationAttributes('parent'));
                this.chart.elements.parent_links.push(this.parent_link);
            }
            else
            {
                this.parent_link.attr('path', path);
            }
        }
    }

    return this;
};

PlanningIssue.prototype.drawProgressBar = function ()
{
    // For milestones, do not show progress bar
    if (this.milestone)
        return;

    // Calculate the position and the dimensions of the progress bar
    var pd_h = 0.2 * this.chart.options.issue_height - 1;
    var pd_x = this.geometry.x + this.chart.options.issue_resize_border;
    var pd_y = this.geometry.y + this.geometry.height - pd_h - 2;
    var pd_minWidth = this.chart.options.issue_resize_border;
    var pd_maxWidth = this.geometry.width - (this.chart.options.issue_resize_border * 2);
    var pd_perPercent = (pd_maxWidth - pd_minWidth) / 100;
    var pd_w = Math.round(pd_minWidth + pd_perPercent * this.progress)

    // Determine color based on schedule
    var behind_color = [200, 0, 0];
    var schedule_color = [25, 50, 25];
    var ahead_color = [0, 125, 0];
    var color = [schedule_color[0], schedule_color[1], schedule_color[2]];

    // Check if the task is on schedule, ahead or behind
    if (this.start_date && this.due_date)
    {
        var nDays = this.due_date.subtract(this.start_date).days();
        var ppd = 100.0 / nDays;
        var nDaysSinceStart = rmp_getToday().subtract(this.start_date).days();
        var expectedProgress = rmp_clamp(ppd * nDaysSinceStart, 0, 100);

        var remaining_days = rmp_clamp(nDays - nDaysSinceStart, 0, nDays);
        var req_ppd = remaining_days > 0 ? (100 - this.progress) / remaining_days : 100.0 - this.progress;
        var factor = req_ppd / ppd;

        if (factor > 1)
        {
            // Behind schedule, factor is now between 1 and infinity. Take the logarithm to get a decent value
            factor = Math.log(factor);
            color = [
                rmp_clamp(schedule_color[0] + (behind_color[0] - schedule_color[0]) * factor, 0, 255),
                rmp_clamp(schedule_color[1] + (behind_color[1] - schedule_color[1]) * factor, 0, 255),
                rmp_clamp(schedule_color[2] + (behind_color[2] - schedule_color[2]) * factor, 0, 255)
            ];
        }
        else
        {
            // Ahead of schedule, factor is now between 1 and infinity. Reverse to get a proper scale
            factor = 1 - factor;
            color = [
                rmp_clamp(schedule_color[0] + (ahead_color[0] - schedule_color[0]) * factor, 0, 255),
                rmp_clamp(schedule_color[1] + (ahead_color[1] - schedule_color[1]) * factor, 0, 255),
                rmp_clamp(schedule_color[2] + (ahead_color[2] - schedule_color[2]) * factor, 0, 255)
            ];
        }
    }

    if (!this.progress_bar)
    {
        // Create the progress bar and set up event handlers
        var cursor = this.children.length ? 'not-allowed' : 'ew-resize';
        this.progress_bar = this.chart.paper.rect(pd_x, pd_y, pd_w, pd_h, 1);
        this.progress_bar.attr({
            'stroke-width': 0,
            'stroke': '#000',
            'fill': 'rgb(' + color[0] + "," + color[1] + "," + color[2] + ')',
            'cursor': cursor,
            'title': this.t('progress', this.progress)
        });

        // Set up event handlers
        this.progress_bar.mousemove(this.changeCursor, this);
        this.progress_bar.mouseout(this.closeTooltip, this);
        this.progress_bar.drag(this.progressMove, this.progressStart, this.progressEnd, this, this, this);
        this.progress_bar.click(this.click, this);
        this.chart.elements.progress_bars.push(this.progress_bar);
        this.progress_bar.toFront();
    }
    else
    {
        // Just update the bar
        this.progress_bar.attr({
            x: pd_x,
            y: pd_y,
            height: pd_h,
            width: pd_w,
            fill: 'rgb(' + color[0] + "," + color[1] + "," + color[2] + ')',
            title: this.t('progress', this.progress)
        });
    }
}

/** IssueRelation class definition */
function PlanningIssueRelation(data, chart)
{
    this.from = data.from;
    this.to = data.to;
    this.type = data.type;
    this.id = data.id;
    this.delay = data.delay ? data.delay : 0;

    this.element = null;
    this.chart = chart ? chart : null;
}

PlanningIssueRelation.prototype.remove = function ()
{
    if (this.element)
    {
        this.element.remove();
        this.element = null;
    }
    this.chart.removeRelation(this.id);
};

PlanningIssueRelation.prototype.click = function (e)
{
    if (!this.chart.deleting)
        return;

    this.chart.deleting = false;
    this.chart.elements.relations.attr('stroke-width', 2);
    jQuery('#redmine_planning_move_button').click();
    var type = this.type;

    var relation = this;

    if (confirm(this.chart.t('confirm_remove_relation', this.type, this.from, this.to)))
    {
        if (this.chart.options.on_delete_relation)
            this.chart.options.on_delete_relation(relation);
        else
            this.remove();
    }
};

/**
 * Set the chart element to which this relation is attached
 *
 * @return PlanningIssueRelation Provides fluent interface
 */
PlanningIssueRelation.prototype.setChart = function (chart, idx)
{
    this.chart = chart;
    this.idx = idx;
    return this;
};

/**
 * Draw the relation between two issues using a SVG path element
 *
 * @return PlanningIssueRelation Provides fluent interface
 */
PlanningIssueRelation.prototype.draw = function ()
{
    // Add to chart if that hadn't been done yet
    if (!this.chart.relations[this.id])
        this.chart.addRelation(this);

    // Get relevant geometry
    if (!this.chart.issues[this.from])
        return;
    if (!this.chart.issues[this.to])
        return;

    var from_geo = this.chart.issues[this.from].geometry;
    var to_geo = this.chart.issues[this.to].geometry;

    if (
        (from_geo.x < this.chart.viewbox.x && to_geo.x < this.chart.viewbox.x) ||
        (from_geo.x > (this.chart.viewbox.x + this.chart.viewbox.w) && to_geo.x > (this.chart.viewbox.x + this.chart.viewbox.w)) ||
        (from_geo.y < this.chart.viewbox.y && to_geo.y < this.chart.viewbox.y) ||
        (from_geo.y > (this.chart.viewbox.y + this.chart.viewbox.h) && to_geo.y > (this.chart.viewbox.y + this.chart.viewbox.y))
    )
    {
        if (this.element)
        {
            this.chart.elements.relations.exclude(this.element);
            this.element.remove();
            delete this.element;
        }
    }

    // Swap from and to for relates types if that improves the view. Relations
    // of type relates are undirected anyway.
    if (this.type == "relates" && from_geo.x > to_geo.x)
    {
        var tmp = from_geo;
        from_geo = to_geo;
        to_geo = tmp;
    }

    // Storage for path points
    var points = [];

    // Starting point is outgoing issue
    points.push([
        from_geo.x + from_geo.width,
        from_geo.y + (from_geo.height / 2.0)
    ]);

    // Extend from outgoing issue by set X-spacing
    points.push([
        points[0][0] + this.chart.options.spacing.x,
        points[0][1]
    ]);

    // If the to-issue starts before the current X coordinate, we need two
    // additional points on the path
    if (to_geo.x < points[1][0])
    {
        // First the point just above the to-issue
        var to_y = to_geo.y > from_geo.y ?
                (to_geo.y - (this.chart.options.spacing.y / 2.0))
            :
                (to_geo.y + to_geo.height + (this.chart.options.spacing.y / 2.0));
        points.push([
            points[1][0],
            to_y
        ]);

        // Then move left to X-spacing pixels before the to-issue
        points.push([
            to_geo.x - this.chart.options.spacing.x,
            to_y
        ]);
    }

    // Move to X-spacing pixels before the to-issue, in the center of the issue
    points.push([
        points[points.length - 1][0],
        to_geo.y + (to_geo.height / 2.0)
    ]);

    // Move to the issue itself
    points.push([
        to_geo.x,
        to_geo.y + (to_geo.height/ 2.0)
    ]);

    // Form the path: start by moving to the proper location
    var action = "M";
    var path = "";

    for (var point_idx = 0; point_idx < points.length; ++point_idx)
    {
        // Iterate over all points and add them to the path string
        path += action + points[point_idx][0] + "," + points[point_idx][1];

        // All actions are draw line except the first
        action = "L";
    }

    // Create new element when necessary, otherwise update current element
    if (!this.element)
    {
        this.element = this.chart.paper.path(path);
        var stroke = this.chart.options.relation[this.type].stroke;
        this.element.attr(this.chart.getRelationAttributes(this.type));
        this.element.click(this.click, this);
        var title = this.chart.t(this.type + "_description", "#" + this.from + ": '" + this.fromIssue.name + "'", "#" + this.to + ": '" + this.toIssue.name + "'", this.delay);
        this.element.attr('title', title);
        this.chart.elements.relations.push(this.element);
    }
    else
    {
        this.element.attr('path', path);
    }


    return this;
};

////////////////////////////////////
// redmine_planning specific code //
////////////////////////////////////
function setFocusDate()
{
    var base_month = jQuery('select#planning_focus_month').val();
    var base_year = jQuery('select#planning_focus_year').val();
    var base_day = jQuery('select#planning_focus_day').val();
    var base_date = new Date();

    base_date.resetTime();
    base_date.setUTCFullYear(base_year);
    base_date.setUTCMonth(base_month - 1);
    base_date.setUTCDate(base_day);

    rm_chart.setBaseDate(base_date);
    rm_chart.draw();
}

function updateIssues(json)
{
    rm_chart.reset();

    var iter;
    for (iter = 0; iter < json.projects.length; ++iter)
        rm_chart.addProject(new PlanningProject(json.projects[iter]));

    for (iter = 0; iter < json.issues.length; ++iter)
        rm_chart.addIssue(new PlanningIssue(json.issues[iter]));

    for (iter = 0; iter < json.relations.length; ++iter)
        rm_chart.addRelation(new PlanningIssueRelation(json.relations[iter], rm_chart));

    rm_chart.draw();
}

function on_create_relation(relation)
{
    jQuery.post(redmine_planning_settings.urls.root + 'issues/' + relation.from + '/rmpcreate', {
        'authenticity_token': AUTH_TOKEN,
        'commit': 'Add',
        'relation': {
            'issue_to_id': relation.to,
            'relation_type': relation.type,
            'delay': relation.delay
        },
        'utf': '✓'
    }, function (response)
    {
        if (!response.success)
            return;

        // Update the id
        relation.id = response.relation.id;

        // Draw the relation
        relation.draw();
    }, "json")
    .error(function (response)
    {
        relation.remove();
        response = jQuery.parseJSON(response.responseText);
        if (response)
            alert(response.errors[0]);
        else
            alert("Unexpected error in adding relation");
    });
}


function on_delete_relation(relation)
{
    jQuery.ajax({
        url: redmine_planning_settings.urls.root + 'relations/' + relation.id,
        data: {'authenticity_token': AUTH_TOKEN},
        type: 'DELETE',
        success: function (result)
        {
            relation.remove();
        },
        dataType: 'script'
    });
}

function on_move_issues(issues)
{
    var store = {"issues": issues, "relations": [], 'authenticity_token': AUTH_TOKEN};
    jQuery.post(redmine_planning_settings.urls.save_planning, store, function (response)
    {
        var ikeys = Object.keys(response);
        for (var iter = 0; iter < ikeys.length; ++iter)
            rm_chart.updateIssue(response[ikeys[iter]]);
    }, "json");
}

function on_set_progress(progress, old_progress)
{
    if (progress == old_progress)
        return;

    var issue = this;
    var store = {"issue": this.id, "percent_done": progress, 'authenticity_token': AUTH_TOKEN};
    var url = redmine_planning_settings.urls.root + 'issues/' + this.id + '/rmpprogress';
    jQuery.post(url, store, function (response)
    {
        if (!response.success)
        {
            alert('Setting progress for issue ' + issue.id + ' failed');
            issue.setProgress(old_progress);
        }
    }, "json")
    .error(function () {
        alert('Setting progress for issue ' + issue.id + ' failed');
        issue.setProgress(old_progress);
    });
}

var rm_chart;

jQuery(function ()
{
    var project = redmine_planning_settings.project;

    // Set up some callbacks
    redmine_planning_settings.on_delete_relation = on_delete_relation;
    redmine_planning_settings.on_create_relation = on_create_relation;
    redmine_planning_settings.on_move_issues = on_move_issues;
    redmine_planning_settings.on_set_progress = on_set_progress;

    // Create the chart
    rm_chart = new PlanningChart(redmine_planning_settings);

    jQuery('#query_form').on('submit', function (e)
    {
        e.preventDefault();

        var f = jQuery(this);
        var params = {};
        var values = f.serialize();
        var url = redmine_planning_settings.urls.get_issues;
        jQuery.getJSON(url, values, updateIssues);
    });

    //setFocusDate();
    jQuery('select#planning_focus_day').on('change', setFocusDate);
    jQuery('select#planning_focus_month').on('change', setFocusDate);
    jQuery('select#planning_focus_year').on('change', setFocusDate);

    setTimeout(function ()
    {
        jQuery('#query_form').submit();
    }, 500);
}); 
