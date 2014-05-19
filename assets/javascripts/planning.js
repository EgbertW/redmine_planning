/*
Copyright 2014 Egbert van der Wal <egbert@assistobot.com>

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

var rm_chart;

/* DateInterval class definition */
function DateInterval(ms) { this.ms = ms; };
DateInterval.prototype.seconds = function () { return this.ms / 1000; };
DateInterval.prototype.minutes = function () { return this.ms / 60000; };
DateInterval.prototype.hours = function () { return this.ms / 3600000; };
DateInterval.prototype.days = function () { return this.ms / 86400000; };
DateInterval.createDays = function(n) { return new DateInterval(86400000 * n) };
DateInterval.createHours = function(n) { return new DateInterval(3600000 * n) };
DateInterval.createMinutes = function(days) { return new DateInterval(60000 * n) };
DateInterval.createSeconds = function(days) { return new DateInterval(1000 * n) };

/* Inject DateInterval into Date class */
Date.prototype.subtract = function (other) { 
    if (other instanceof Date)
        return new DateInterval(this - other);
    else if (other instanceof DateInterval)
        return new Date(this.getTime() - other.ms);
    else
        throw "Invalid argument: " + other;
};
Date.prototype.add = function (interval) { var r = new Date(); r.setTime(this.getTime() + interval.ms); return r;};
Date.prototype.toISODateString = function () { return this.getFullYear() + "-" + (this.getMonth() + 1) + "-" + this.getDate(); };
Date.prototype.resetTime = function () { this.setUTCHours(0); this.setUTCMinutes(0); this.setUTCSeconds(0); };

function t(str)
{
    str = rm_chart.translations[str] ? rm_chart.translations[str] : "N/A";

    for (var i = 1; i < arguments.length; ++i)
        str = str.replace("##" + i, arguments[i]) 

    return str;
}

function getToday()
{
    var today = new Date();
    today.resetTime();
    var d = today.getDate();
    if (d % 2 != 0)
        --d;
    today.setUTCDate(d);
    return today;
}

function showTooltip(issue)
{
    var $ = jQuery;
    
    var d = $('.planning-tooltip');
    if (d.length)
    {
        if (d.data('issue_id') == issue.id)
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
    d.data('issue_id', issue.id);

    var s = issue.chart.getScale();
    var pos = $('#' + issue.chart.options.target).position();
    var x = s[0] * (issue.geometry.x - issue.chart.viewbox.x) + pos.left;
    var y = s[1] * (issue.geometry.y - issue.chart.viewbox.y + issue.chart.options.issue_height + issue.chart.options.spacing.y) + pos.top;

    if (x < pos.left)
        x = pos.left;
    
    d.addClass('planning-tooltip')
    .css({
        'left': x,
        'top': y,
    });

    var parent_issue = 'none';
    if (issue.parent_issue)
    {
        parent_issue = '<a href="/issues/' + issue.parent_issue.id + '" target="_blank">' 
            + issue.parent_issue.tracker + ' #' + issue.parent_issue.id + ': ' + issue.parent_issue.name
            + '</a>';
    }
    else if (issue.parent_id)
    {
        parent_issue = '<a href="/issues/' + issue.parent_id + '" target="_blank">'
            + "#" + issue.parent_id + " (" + t('unavailable') + ")";
    }

    var desc = issue.description;
    if (desc.length > 500)
        desc = desc.substr(0, 300);

    d.html(
        '<table>' +
        '<tr><th colspan="2" style="text-align: left; padding-bottom: 5px;">' + issue.tracker + ' <a href="/issues/' + issue.id + '" target="_blank">#' + issue.id + '</a>: ' + issue.name + '</th></tr>' +
        '<tr><th>' + t('project') + ':</th><td><a href="/projects/' + issue.project_identifier + '" target="_blank">' + issue.project + '</a></td></tr>' + 
        '<tr><th>' + t('parent_task') + ':</th><td>' + parent_issue + '</td></tr>' +
        '<tr><th>' + t('start_date') + ':</th><td>' + issue.chart.formatDate(issue.start_date) + '</td></tr>' + 
        '<tr><th>' + t('due_date') + ':</th><td>' + issue.chart.formatDate(issue.due_date) + '</td></tr>' + 
        '<tr><th>' + t('leaf_task') + ':</th><td>' + (issue.leaf ? t('yes') : t('no')) + '</td></tr>' +
        '<tr><th>' + t('description') + ':</th><td>' + desc + '</td></tr>' 
    );

    $('body').append(d);

    // Add hover handler
    d.on("mousemove", function () {
        var tt = jQuery(this);
        tt.show();
        var to = jQuery(this).data('timeout');
        if (to)
        {
            clearTimeout(to);
            tt.data('timeout', null);
        }
    }).on("mouseleave", function () {
        var tt = jQuery(this);
        if (!tt.data('timeout'))
        {
            var to = setTimeout(function () {
                tt.fadeOut(function() {jQuery(this).remove()});
            }, 1000);
            tt.data('timeout', to);
        }
    });
}

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
        month_names: [null, 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
        abbr_month_names: [null, 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        project: '',
        root_url: '/',
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

    this.options = jQuery.extend(defaults, options);

    if (this.options['target'].substr(0, 1) == '#')
        this.options['target'] = this.options['target'].substr(1);

    var numeric = {
        'issue_height': parseInt,
        'day_width': parseInt,
        'zoom_level': parseInt,
        'min_zoom_level': parseInt,
        'max_zoom_level': parseInt,
        'zoom_factor': parseFloat,
        'issue_resize_border': parseInt,
    };
    for (var k in numeric)
        this.options[k] = numeric[k](this.options[k]);
    this.options['margin'].x = parseInt(this.options['margin'].x);
    this.options['margin'].y = parseInt(this.options['margin'].y);
    this.options['spacing'].x = parseInt(this.options['spacing'].x);
    this.options['spacing'].y = parseInt(this.options['spacing'].y);

    // Set up translations
    this.translations = {
        parent_task: 'Parent task',
        start_date: 'Start date',
        due_date: 'Due date',
        description: 'Description',
        leaf_task: 'Leaf task',
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
    this.dirty = {};
    this.setBaseDate(this.options['base_date'] ? this.options['base_date'] : getToday());
    this.container = $('#' + this.options['target']);
    var pos = this.container.position();
    this.container.css('margin-left', -pos.left);
    this.container.css('margin-right', -pos.left);
    var chart = this;

    var resizeFn = function () {
        var pos = chart.container.position();
        var footHeight = $('#footer').outerHeight();
        var contentPadding = parseInt($('#content').css('padding-bottom'));
        var h = Math.max(500, $(window).innerHeight() - pos.top - footHeight - contentPadding);
        var w = $(window).innerWidth() - 2; //- (2 * pos.left);

        chart.container.css({
            'width': w,
            'height': h,
            'margin-bottom': 200
        });
    }
    jQuery(window).on('resize', resizeFn).resize();
    
    this.paper = Raphael(this.options['target']);
    var w = this.container.innerWidth();
    var h = this.container.innerHeight();
    this.geometry_limits = {x: [-w / 2, -w / 2], y: [0, 0]};
    this.setViewBox(Math.round(w / -2), 0, w, h);
    this.addBackground();
    this.container.on('mousewheel', function (e) {
        // Try to avoid default browser scrolling behavior. However, in Chrome,
        // this doesn't seem to work. That is why, in addition to Ctrl+Scroll ->
        // Zoom, Alt+Scroll also works.
        e.preventDefault();
        e.stopImmediatePropagation();

        if (!e.ctrlKey && !e.altKey)
        {
            var v = e.deltaY > 0 ? -1 : (e.deltaY < 0 ? 1 : 0);
            var h = e.deltaX > 0 ? 1 : (e.deltaX < 0 ? -1 : 0);

            var day_factor = Math.max(1, Math.pow(2, (-rm_chart.options.zoom_level) + 1));
            var new_x = chart.viewbox.x + h * chart.dayWidth() * day_factor;
            var new_y = chart.viewbox.y + v * (chart.options.issue_height + chart.options.spacing.y) * 1;

            chart.setViewBox(new_x, new_y, chart.viewbox.w, chart.viewbox.h);
        }
        else
        {
            var zoom = rm_chart.options.zoom_level;

            if (e.deltaY > 0)
                ++zoom;
            else if (e.deltaY < 0)
                --zoom;
            var min_zoom_level = -2;
            var zoom_upper_limit = 3;
            var zoom_factor = 1.5;
            zoom = Math.min(Math.max(rm_chart.options.min_zoom_level, zoom), rm_chart.options.max_zoom_level);
            rm_chart.options.zoom_level = zoom;

            // Determine new width and height
            var new_w = Math.round(rm_chart.container.width() / Math.pow(rm_chart.options.zoom_factor, zoom));
            var new_h = Math.round(rm_chart.container.height() / Math.pow(rm_chart.options.zoom_factor,zoom));

            // We want the center to go to the point where the scroll button was hit
            var center_pos = rm_chart.clientToCanvas(e.offsetX, e.offsetY);
            var cx = new_w < rm_chart.viewbox.w ? Math.round(center_pos[0] - new_w / 2) : rm_chart.viewbox.x;
            var cy = new_h < rm_chart.viewbox.h ? Math.round(center_pos[1] - new_h / 2) : rm_chart.viewbox.y;

            rm_chart.setViewBox(cx, cy, new_w, new_h);
        }
    });
}

PlanningChart.prototype.setMonthNames = function(names, abbreviations)
{
    this.options['month_names'] = jQuery.extend({}, names);
    this.options['abbr_month_names'] = jQuery.extend({}, abbreviations);
}

PlanningChart.prototype.getTrackerAttrib = function(tracker, attrib)
{
    if (this.options.tracker[tracker] && this.options.tracker[tracker][attrib])
        return this.options.tracker[tracker][attrib];
    return this.options.tracker['Default'][attrib];
};

PlanningChart.prototype.getRelationAttributes = function(relation_type)
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

PlanningChart.prototype.setBaseDate = function(date)
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
}

function clamp(val, min, max)
{
    if (jQuery.isArray(min))
        return Math.max(min[0], Math.min(min[1], val));
    return Math.max(min, Math.min(max, val));
}

PlanningChart.prototype.setViewBox = function(x, y, w, h)
{
    // Set new viewbox
    if (!this.viewbox)
        this.viewbox = {};

    this.viewbox.x = x = clamp(x, this.geometry_limits.x);
    this.viewbox.y = y = clamp(y, this.geometry_limits.y);
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
    for (var k in this.issues)
    {
        if (k == "length")
            continue;
        if (
            this.issues[k].due_date >= start_date && 
            this.issues[k].start_date < end_date &&
            this.issues[k].geometry.y >= this.viewbox.y + this.options.margin.y
        )
        {
            if (!this.issues[k].element)
            {
                this.issues[k].update();
                this.issues[k].updateRelations();
            }
        }
        else if (this.issues[k].element)
        {
            this.issues[k].update();
        }
    }
}

PlanningChart.prototype.createRelation = function(type)
{
    if (type !== "blocks" && type !== "precedes" && type !== "relates" && type !== "copied_to" && type !== "duplicates")
        throw "Invalid relation: " + type;
    this.relating = {'type': type, 'from': null, 'to': null};
};

PlanningChart.prototype.dayWidth = function()
{
    return this.options.day_width;
};

PlanningChart.prototype.formatDate = function(date)
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
}


PlanningChart.prototype.addIssue = function(issue)
{
    if (this.issues[issue.id])
        return;

    issue.setChart(this, this.issues.length++);
    this.issues[issue.id] = issue;
};

PlanningChart.prototype.removeIssue = function(id)
{
    if (this.issues[id])
    {
        if (this.issues[id].element)
            this.issues[id].element.remove();
        delete this.issues[id];
    }
}

PlanningChart.prototype.addRelation = function(relation)
{
    if (this.relations[relation.id])
        return this.relations[relation.id];

    if (!this.issues[relation.from])
        return relation;

    if (!this.issues[relation.to])
        return relation;

    relation.setChart(this, this.relations.length++);
    this.relations[relation.id] = relation;
    return relation;
};

PlanningChart.prototype.removeRelation = function(id)
{
    if (this.relations[id])
    {
        if (this.relations[id].element)
            this.relations[id].element.remove();
        for (var k in this.relations[id].fromIssue.relations.outgoing)
        {
            if (this.relations[id].fromIssue.relations.outgoing[k].id = id)
            {
                delete this.relations[id].fromIssue.relations.outgoing[k];
                break;
            }
        }
        for (var k in this.relations[id].toIssue.relations.incoming)
        {
            if (this.relations[id].toIssue.relations.incoming[k].id = id)
            {
                delete this.relations[id].toIssue.relations.incoming[k];
                break;
            }
        }

        delete this.relations[id];
    }
}

PlanningChart.prototype.addBackground = function ()
{
    // Add background to enable panning
    this.bg = this.paper.rect(-10000, -10000, 20000, 20000, 5); 
    this.bg.attr('fill', '#fff');
    this.bg.toBack();

    var chart = this;

    this.bg.drag(function (dx, dy) {
        var w = chart.dayWidth();
        var h = chart.options.issue_height;
        var nDays = Math.round(dx / -w);
        var nIssues = Math.round(dy / -h);

        var new_x = chart.viewbox.sx + nDays * w;
        var new_y = chart.viewbox.sy + nIssues * h;
        if (new_x != chart.viewbox.x || new_y != chart.viewbox.y)
            chart.setViewBox(new_x, new_y, chart.viewbox.w, chart.viewbox.h);
    }, function () {
        chart.viewbox.sx = chart.viewbox.x;
        chart.viewbox.sy = chart.viewbox.y;
    });
};

PlanningChart.prototype.reset = function()
{
    this.paper.clear();
    this.header = null;
    this.elements = {'issues': this.paper.set(), 'relations': this.paper.set(), 'issue_texts': this.paper.set(), 'parent_links': this.paper.set()};
    this.addBackground();
    this.drawHeader();
    this.issues = {'length': 0};
    this.relations = {'length': 0};
};

PlanningChart.prototype.drawHeader = function(start_date, end_date)
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

    for (var w = startDay; w <= endDay; w += 2)
    {
        var cur = new Date(base.getTime() + w * 86400000);

        var days = cur.subtract(base).days();
        var x = this.options.margin.x + days * dw;
        var y = this.viewbox.y;

        var line = this.paper.path("M" + x + "," + -10000 + "L" + x + "," + 10000);
        line.attr('title', this.formatDate(cur));
        lines.push(line);

        if ((dw >= 20 && w % 4 == 0) || w % 8 == 0)
            texts.push(this.paper.text(x + 2, y + 10, this.formatDate(cur)));
    }

    this.header.push(lines);
    this.header.push(texts);
    lines.attr({
        'stroke': '#bbb',
        'stroke-width': 1,
    });
    texts.attr({
        'font-size': 10,
        'font-weight': 100
    });

    // Draw today
    var t = getToday();
    var days = t.subtract(base).days();
    var x = this.options.margin.x + days * dw;
    var today = this.paper.path("M" + x + "," + -10000 + "L" + x + "," + 10000)
    .attr({
        'stroke': '#6f6',
        'stroke-width': 2,
        'title': 'Today: ' + this.formatDate(t)
    });

    this.header.push(today);

    // Draw focus date
    var x = this.options.margin.x;
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
    }
};

PlanningChart.prototype.draw = function(redraw)
{
    var w = this.container.width();
    var h = this.container.height();
    this.geometry_limits = {'x': [-w / 2, -w / 2], 'y': [0, 0]}
    this.drawHeader();

    this.analyzeHierarchy();
    for (var k in this.issues)
    {
        if (k == "length")
            continue;
        this.issues[k].update();
    }

    for (var k in this.relations)
    {
        if (k == "length")
            continue;
        this.relations[k].draw();
    }
};

PlanningChart.prototype.getScale = function()
{
    return [
        this.container.width() / this.viewbox.w,
        this.container.height() / this.viewbox.h
    ];
};

PlanningChart.prototype.clientToCanvas = function(x, y)
{
    var s = this.getScale();
    var cx = x / s[0] + this.viewbox.x;
    var cy = y / s[1] + this.viewbox.y;

    return [cx, cy];
};

PlanningChart.prototype.analyzeHierarchy = function()
{
    // Reset and initialize all relation arrays
    for (var k in this.issues)
    {
        if (k == "length")
            continue;

        this.issues[k].children = [];
    }
    for (var k in this.issues)
    {
        if (k == "length")
            continue;
        this.issues[k].relations.incoming = [];
        this.issues[k].relations.outgoing = [];

        if (this.issues[k].parent_id != null && this.issues[this.issues[k].parent_id])
        {
            this.issues[k].parent_issue = this.issues[this.issues[k].parent_id];
            this.issues[k].parent_issue.children.push(this.issues[k]);
        }
    }

    // Add all relations to the corresponding issues
    for (var k in this.relations)
    {
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

PlanningChart.prototype.markDirty = function(issue)
{
    this.dirty[issue.id] = issue;
}

PlanningChart.prototype.saveDirty = function()
{
    var store = {"issues": [], "relations": [], 'authenticity_token': AUTH_TOKEN};
    for (var id in this.dirty)
    {
        store.issues.push({
            'id': id,
            'start_date': this.dirty[id].start_date.toISODateString(),
            'due_date': this.dirty[id].due_date.toISODateString()
        });
        this.dirty[id].orig_data = null;
        this.dirty[id].orig_geometry = null;
        delete this.dirty[id].critical_path_determined;
    }
    var chart = this;
    $.post(this.options.root_url + 'projects/' + this.options.project + '/plan', store, function (response) {
        for (var issue_id in response)
        {
            var issue = chart.issues[issue_id];
            if (!issue)
                continue;
            var saved_start_date = new Date(response[issue_id].start_date);
            var saved_due_date = new Date(response[issue_id].due_date);
            
            var update = [false, false];
            if (saved_start_date.getTime() != issue.start_date.getTime())
            {
                issue.start_date = saved_start_date;
                update[0] = true;
            }
            if (saved_due_date.getTime() != issue.due_date.getTime())
            {
                issue.due_date = saved_due_date;
                update[1] = true;
            }
            if (update[0] || update[1])
            {
                issue.update();
                if (update[0])
                    for (var k in issue.relations.incoming)
                        issue.relations.incoming[k].draw();
                if (update[1])
                    for (var k in issue.relations.outgoing)
                        issue.relations.outgoing[k].draw();
            }

            issue.update();
        }
    }, "json");
    this.dirty = {};
}

/* Issue class definition */
function PlanningIssue(data)
{
    this.start_date = new Date(data['start_date']);
    this.due_date = new Date(data['due_date']);
    this.name = data['name'];
    this.description = data['description'];
    this.project = data['project_name'];
    this.project_identifier = data['project_identifier'];
    this.project_id = data['project_id'];
    this.id = data['id'];
    this.tracker = data['tracker'];
    this.leaf = data['leaf'] ? true : false;
    this.parent_id = data['parent'];
    this.parent_issue = null;
    this.children = [];

    this.relations = {};
    this.chart = null;
    this.element = null;
    this.geometry = null;
}

PlanningIssue.prototype.setChart = function(chart, idx)
{
    this.chart = chart;
    this.idx = idx;
};

PlanningIssue.prototype.getRelations = function()
{
    if (!this.relations.incoming || !this.relations.outgoing)
        this.chart.analyzeHierarchy();

    var list = [];
    for (var k in this.relations.incoming)
        list.push(this.relations.incoming[k]);
    for (var k in this.relations.outgoing)
        list.push(this.relations.outgoing[k]);
    return list;
};

PlanningIssue.prototype.update = function()
{
    // Recalculate geometry
    var base = this.chart.base_date;
    var startDay = this.start_date !== null ? this.start_date.subtract(base).days() : getToday().subtract(base).days();
    var nDays = this.due_date !== null ? Math.max(1, this.due_date.subtract(this.start_date).days()) : 1;
    this.geometry = {
        x: this.chart.options.margin.x + (startDay * this.chart.dayWidth()),
        y: this.chart.options.margin.y + this.idx * (this.chart.options.issue_height + this.chart.options.spacing.y),
        height: this.chart.options.issue_height,
        width: this.chart.dayWidth() * nDays
    };

    this.chart.geometry_limits.x[0] = Math.min(this.geometry.x - this.chart.options.margin.x, this.chart.geometry_limits.x[0]);
    this.chart.geometry_limits.x[1] = Math.max(this.geometry.x - this.chart.options.margin.x, this.chart.geometry_limits.x[1]);
    this.chart.geometry_limits.y[0] = Math.min(this.geometry.y - this.chart.options.margin.y, this.chart.geometry_limits.y[0]);
    this.chart.geometry_limits.y[1] = Math.max(this.geometry.y - this.chart.options.margin.y, this.chart.geometry_limits.y[1]);

    return this.draw();
}

PlanningIssue.prototype.backup = function()
{
    if (!this.orig_geometry)
        this.orig_geometry = jQuery.extend({}, this.geometry);
    if (!this.orig_data)
    {
        this.orig_data = {'start_date': this.start_date, 'due_date': this.due_date};
        if (this.orig_data.start_date == null || this.orig_data.start_date.getFullYear() == "1970")
            this.orig_data.start_date = getToday();
        if (this.orig_data.due_date == null || this.orig_data.due_date.getFullYear() == "1970")
            this.orig_data.due_date = this.orig_data.start_date.add(DateInterval.createDays(1));
    }
    this.chart.markDirty(this);
};

PlanningIssue.prototype.move = function(arg1, arg2)
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
        if (arg1.ms == 0)
            return;

        this.start_date = this.start_date.add(arg1);
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
        throw "Invalid arguments: arg1: " + arg1 + ", arg2: " + arg2;

    // Make sure the element is marked dirty
    this.backup();
    this.update();

    // Update dependent issues
    for (var k in this.relations.outgoing)
    {
        var r = this.relations.outgoing[k];
        switch (r.type)
        {
            case "blocks":
                if (r.toIssue.due_date < this.due_date)
                {
                    var delay = this.due_date.subtract(r.toIssue.due_date);
                    r.toIssue.move(delay);
                }
                break;
            case "precedes":
                var target = this.due_date.add(DateInterval.createDays(r.delay + 1));
                var delay = target.subtract(r.toIssue.start_date);
                r.toIssue.move(delay);
                break;
        }
        r.draw();
    }

    for (var k in this.relations.incoming)
    {
        var r = this.relations.incoming[k];
        switch (r.type)
        {
            case "blocks":
                if (this.due_date < r.fromIssue.due_date)
                {
                    var delay = this.due_date.subtract(r.fromIssue.due_date);
                    r.fromIssue.move(delay);
                }
                break;
            case "precedes":
                var target = this.start_date.subtract(DateInterval.createDays(r.delay + 1));
                var delay = target.subtract(r.fromIssue.due_date);
                r.fromIssue.move(delay);
                break;
        }
        r.draw();
    }

    // Check parent relations
    this.checkParents();

    // If parent was moved, children should move by the same amount
    if (arg1 instanceof DateInterval)
        for (var ch in this.children)
            this.children[ch].move(arg1);

}

PlanningIssue.prototype.calculateLimits = function(direction, ctime)
{
    var start_element = false;
    if (!ctime)
    {
        ctime = new Date();
        start_element = true;
    }
    else if (this.critical_path_time && this.critical_path_time >= ctime)
        return;

    this.critical_path_time = ctime;
    this.min_start_date = null;
    this.max_start_date = null;
    this.min_due_date = null;
    this.max_due_date = null;

    var duration = this.due_date.subtract(this.start_date);

    // Check parent issue critical path
    if (this.parent_issue)
    {
        this.parent_issue.calculateLimits(direction, ctime);
        if (direction <= 0)
        {
            var limit = this.parent_issue.min_start_date;
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
            var limit = this.parent_issue.max_due_date;
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
    for (var type in this.relations)
    {
        if (direction > 0 && type == "incoming")
            continue;
        if (direction < 0 && type == "outgoing")
            continue;

        for (var k in this.relations[type])
        {
            // Update min_start_date
            var r = this.relations[type][k];
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
                        var limit = r.fromIssue.min_due_date;
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
                        var limit = r.toIssue.max_start_date;
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

    if (direction != 0)
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
        this.min_due_date = this.min_start_date.add(duration);
    if (this.max_due_date)
        this.max_start_date = this.max_due_date.subtract(duration);

    if (start_element)
    {
        if (this.critical_lines)
            this.critical_lines.remove();

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
    while (cur_parent)
    {
        var cur_start_date = null;
        var cur_due_date = null;
        for (var k in cur_parent.children)
        {
            if (cur_start_date == null || cur_start_date > cur_parent.children[k].start_date)
                cur_start_date = cur_parent.children[k].start_date;
            if (cur_due_date == null || cur_due_date < cur_parent.children[k].due_date)
                cur_due_date = cur_parent.children[k].due_date;
        }

        // Update the parent to the new correct size
        cur_parent.move(cur_start_date, cur_due_date);

        // Traverse the tree to the root
        cur_child = cur_parent;
        cur_parent = cur_child.parent_issue;
    }
}

PlanningChart.prototype.eventToCanvas = function(e)
{
    var s = this.getScale();
    if (!e.offsetX)
    {
        var x = Math.round((e.layerX / s[0]) + this.viewbox.x);
        var y = Math.round((e.layerY / s[1]) + this.viewbox.y);
    }
    else
    {
        var x = Math.round((e.offsetX / s[0]) + this.viewbox.x);
        var y = Math.round((e.offsetY / s[1]) + this.viewbox.y);
    }
    return [x, y];
}

function PlanningIssue_closeTooltip(e)
{
    var tt = jQuery('.planning-tooltip');
    if (!tt.data('timeout'))
    {
        var to = setTimeout(function () {
            tt.fadeOut(function () {jQuery(this).remove();});
        }, 1000);
        tt.data('timeout', to);
    }
}

function PlanningIssue_changeCursor(e, mouseX, mouseY)
{
    if (this.dragging || this.chart.dragging)
        return;

    if (!this.leaf)
    {
        this.element.attr('cursor', 'move');
        this.text.attr('cursor', 'move');
        showTooltip(this);
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

    var pos = this.chart.eventToCanvas(e);
    var x = pos[0];
    var y = pos[1];

    var relX = x - this.element.attr('x');
    var relY = y - this.element.attr('y');

    if (relX <= this.chart.options.issue_resize_border)
    {
        this.element.attr('cursor', 'w-resize');
        this.text.attr('cursor', 'w-resize');
    }
    else if (relX >= this.element.attr('width') - this.chart.options.issue_resize_border)
    {
        this.element.attr('cursor', 'e-resize');
        this.text.attr('cursor', 'e-resize');
    }
    else
    {
        this.element.attr('cursor', 'move');
        this.text.attr('cursor', 'move');
        showTooltip(this);
    }
}

function PlanningIssue_click()
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

    chart.relating.to = this.id;

    var new_relation = this.chart.relating;
    new_relation.delay = null;
    if (new_relation.type == "precedes")
        new_relation.delay = this.start_date.subtract(source.due_date).days() - 1;
    chart.relating = null;
    $('#redmine_planning_cancel_button').attr('title', t('delete_relation'));

    jQuery.post(chart.options.root_url + 'issues/' + new_relation.from + '/relations', {
        'authenticity_token': AUTH_TOKEN,
        'commit': 'Add',
        'relation': {
            'issue_to_id': new_relation.to,
            'relation_type': new_relation.type,
            'delay': new_relation.delay
        },
        'utf': '✓'
    }, function (response) {
        var pattern = /a href=\\"\/relations\/([0-9]+)\\"/g;
        var m = response.match(pattern);

        if (!m)
        {
            alert(t('adding_relation_failed'));
            return;
        }
        
        var last_match = m[m.length - 1];
        var m = pattern.exec(last_match);
        new_relation.id = m[1];

        var relation = new PlanningIssueRelation(new_relation);
        relation = chart.addRelation(relation);
        
        // Set up additional info
        relation.fromIssue = chart.issues[relation.from];
        relation.toIssue = chart.issues[relation.to];
        relation.fromIssue.relations.outgoing.push(relation);
        relation.toIssue.relations.incoming.push(relation);

        // Draw the relation
        relation.draw();
    }, "script");

}

function PlanningIssue_dragStart()
{
    if (this.chart.relating || this.chart.deleting)
        return;

    jQuery('.planning-tooltip').remove();
    this.dragging = true;
    this.chart.dragging = true;
    this.backup();
    this.getRelations();
    this.calculateLimits(0);
}

function PlanningIssue_dragMove(dx, dy, x, y)
{
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

    var pos = this.chart.clientToCanvas(x, y);
    var tt_date;
    if (cursor == "move")
        tt_date = "<strong>" + t('move_to') + ":</strong> " + this.chart.formatDate(this.orig_data.start_date.add(movement));
    else if (cursor == 'w-resize')
        tt_date = "<strong>" + t('start_date') + ":</strong> " + this.chart.formatDate(this.orig_data.start_date.add(movement));
    else if (cursor == 'e-resize')
        tt_date = "<strong>" + t('due_date') + ":</strong> " + this.chart.formatDate(this.orig_data.due_date.add(movement));

    var tt = $('.date-tooltip');
    if (tt.length == 0)
    {
        tt = $('<div></div>')
            .addClass('date-tooltip')
            .appendTo('body');
    }

    var pos = $('#' + this.chart.options.target).position();
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
}

function PlanningIssue_dragEnd()
{
    if (this.chart.relating || this.chart.deleting)
        return;

    if (!this.dragging)
        return;

    $('.date-tooltip').remove();

    this.dragging = false;
    this.chart.dragging = false;
    this.chart.saveDirty();
    if (this.critical_lines)
    {
        this.critical_lines.remove();
        delete this.critical_lines;
    }
}

PlanningIssue.prototype.updateRelations = function()
{
    for (var t in this.relations)
    {
        for (var k in this.relations[t])
        {
            if (k == "length")
                continue;
            this.relations[t][k].draw();
        }
    }
};

/**
 * Draw the issue on the chart
 *
 * @return PlanningIssue Provides fluent interface
 */
PlanningIssue.prototype.draw = function()
{
    // If no geometry has been calcalated, do so and return to avoid recursion
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
        (ey < this.chart.viewbox.y + this.chart.options.margin.y * 2)
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
        if (this.parent_link)
        {
            this.chart.elements.parent_links.exclude(this.parent_link);
            this.parent_link.remove();
            delete this.parent_link;
        }
        return;
    }

    if (!this.element)
    {
        var type;
        if (!this.parent && this.children.length)
            type = "root";
        else if (this.parent && this.children.length)
            type == "branch";
        else
            type = "leaf";

        var fill = this.chart.getTrackerAttrib(this.tracker, 'fill_color');
        this.element = this.chart.paper.rect(
            this.geometry.x,
            this.geometry.y,
            this.geometry.width,
            this.geometry.height,
            this.chart.options.type[type].radius
        );

        this.element.toFront();
        this.element.attr({
            'stroke': this.chart.options.type[type].stroke,
            'stroke-width': this.chart.options.type[type].width,
            'fill': fill
        });

        this.element.mousemove(PlanningIssue_changeCursor, this);
        this.element.mouseout(PlanningIssue_closeTooltip, this);
        this.element.drag(PlanningIssue_dragMove, PlanningIssue_dragStart, PlanningIssue_dragEnd, this, this, this);
        this.element.click(PlanningIssue_click, this);

        this.chart.elements.issues.push(this.element);
    }
    else
    {
        this.element.attr(this.geometry);
    }

    if (!this.text)
    {
        var text_color = this.chart.getTrackerAttrib(this.tracker, 'text_color');
        var n = this.tracker.substr(0, 1) + "#" + this.id + ": " + this.name;
        var max_length = this.geometry['width'] / 8;
        if (n.length > max_length)
            n = n.substring(0, max_length) + "...";
        this.text = this.chart.paper.text(
            this.geometry.x + (this.geometry.width / 2),
            this.geometry.y + (this.geometry.height / 2),
            n
        );
        var attribs = {
            'font-size': 9,
            'cursor': 'move'
        };
        if (text_color != "#000" && text_color != "black" && text_color !=" #000000")
            attribs['stroke'] = text_color;
        this.text.attr(attribs);
        this.text.mousemove(PlanningIssue_changeCursor, this);
        this.text.mouseout(PlanningIssue_closeTooltip, this);
        this.text.drag(PlanningIssue_dragMove, PlanningIssue_dragStart, PlanningIssue_dragEnd, this, this, this);
        this.text.click(PlanningIssue_click, this);

        this.chart.elements.issue_texts.push(this.text);
    }
    else
    {
        var n = this.tracker.substr(0, 1) + "#" + this.id + ": " + this.name;
        var max_length = this.geometry['width'] / 8;
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
                this.parent_link.attr('path', path);
        }
    }

    return this;
}

/** IssueRelation class definition */
function PlanningIssueRelation(data)
{
    this.from = data['from'];
    this.to = data['to'];
    this.type = data['type'];
    this.id = data['id'];
    this.delay = data['delay'] ? data['delay'] : 0;

    this.element = null;
    this.chart = null;
}

function PlanningIssueRelation_click(e)
{
    if (!this.chart.deleting)
        return;

    this.chart.deleting = false;
    $('#redmine_planning_cancel_button').attr('title', t('delete_relation'));
    this.chart.elements.relations.attr('stroke-width', 2);
    var type = this.type;

    var relation = this;

    if (confirm(t('confirm_remove_relation', this.type, this.from, this.to)))
    {
        $.ajax({
            url: this.chart.options.root_url + 'relations/' + this.id,
            data: {'authenticity_token': AUTH_TOKEN},
            type: 'DELETE',
            success: function(result) {
                relation.element.remove();
                relation.chart.removeRelation(relation.id);
            },
            dataType: 'script'
        });
    }
}

/**
 * Set the chart element to which this relation is attached
 * 
 * @return PlanningIssueRelation Provides fluent interface
 */
PlanningIssueRelation.prototype.setChart = function(chart, idx)
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
PlanningIssueRelation.prototype.draw = function()
{
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
    var path = ""
    
    for (var point_idx in points)
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
        this.element.click(PlanningIssueRelation_click, this);
        var title = t(this.type + "_description", "#" + this.from + ": '" + this.fromIssue.name + "'", "#" + this.to + ": '" + this.toIssue.name + "'", this.delay);
        this.element.attr('title', title);
        this.chart.elements.relations.push(this.element);
    }
    else
        this.element.attr('path', path);


    return this;
}

function setFocusDate()
{
    var base_month = $('select#planning_focus_month').val();
    var base_year = $('select#planning_focus_year').val();
    var base_day = $('select#planning_focus_day').val();
    var base_date = new Date();

    base_date.resetTime();
    base_date.setUTCFullYear(base_year);
    base_date.setUTCMonth(base_month - 1);
    base_date.setUTCDate(base_day);

    rm_chart.setBaseDate(base_date);
    rm_chart.draw();
}

jQuery(function () {
    rm_chart = new PlanningChart(redmine_planning_settings);
    var project = redmine_planning_settings['project'];

    jQuery('#query_form').on('submit', function (e) {
        e.preventDefault();

        var f = $(this);
        var params = {};
        var values = f.serialize();
        jQuery.getJSON(redmine_planning_settings.root_url + 'projects/' + project + '/plan/issues', values, updateIssues);
    });

    setFocusDate();
    jQuery('select#planning_focus_day').on('change', setFocusDate);
    jQuery('select#planning_focus_month').on('change', setFocusDate);
    jQuery('select#planning_focus_year').on('change', setFocusDate);

    setTimeout(function () {
        $('#query_form').submit();
    }, 500);

    $('#redmine_planning_panel_2').buttonset();

    $('#redmine_planning_back_button').click(function () {
        rm_chart.setBaseDate(rm_chart.base_date.add(DateInterval.createDays(-16)));
        rm_chart.setViewBox(Math.round(rm_chart.viewbox.w / -2), rm_chart.viewbox.y, rm_chart.viewbox.w, rm_chart.viewbox.h);
        rm_chart.draw();
    });
    $('#redmine_planning_forward_button').click(function () {
        rm_chart.setBaseDate(rm_chart.base_date.add(DateInterval.createDays(16)));
        rm_chart.setViewBox(Math.round(rm_chart.viewbox.w / -2), rm_chart.viewbox.y, rm_chart.viewbox.w, rm_chart.viewbox.h);
        rm_chart.draw();
    });

    $('.add_relation_button').click(function () {
        var type = jQuery(this).data('type');
        $('#redmine_planning_cancel_button').attr('title', t('cancel'));
        rm_chart.createRelation(type);
    });

    $('#redmine_planning_cancel_button').click(function () {
        if (rm_chart.relating)
        {
            rm_chart.relating = null;
            $('#redmine_planning_cancel_button').attr('title', t('delete_relation'));
        }
        else
        {
            if (rm_chart.deleting)
            {
                $('#redmine_planning_cancel_button').attr('title', t('delete_relation'));
                rm_chart.deleting = false;
                rm_chart.elements.relations.attr('stroke-width', 2);
            }
            else
            {
                $('#redmine_planning_cancel_button').attr('title', t('cancel'));
                rm_chart.deleting = true;
                rm_chart.elements.relations.attr('stroke-width', 4);
            }
        }
    });
});

function updateIssues(json)
{
    rm_chart.reset();

    for (var k in json['issues'])
        rm_chart.addIssue(new PlanningIssue(json['issues'][k]));

    for (var k in json['relations'])
        rm_chart.addRelation(new PlanningIssueRelation(json['relations'][k]));

    rm_chart.draw();
}
