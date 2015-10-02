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

function updateDates(el, days)
{
    // Make sure to start from the original dates, not from the updated dates
    var html = el.data('orig_html');
    if (!html)
    {
        html = el.html();
        el.data('orig_html', html);
    }

    // Find all date strings
    var pattern = /([0-9]{2})\/([0-9]{2})\/([0-9]{4})/g;
    while (match = pattern.exec(html))
    {
        var pos = match.index;
        var len = 10;
        
        // Parse the date and add the number of days requested
        var date = new Date(match[3], match[1] - 1, match[2]);
        date.setDate(parseInt(match[2]) + days);

        // Format into proper date string
        var newDate = "";
        if (date.getMonth() < 9)
            newDate += "0";
        newDate += (date.getMonth() + 1) + "/";
        if (date.getDate() < 10)
            newDate += "0";
        newDate += date.getDate() + "/" + date.getFullYear();
        
        // Stitch back together
        html = html.substr(0, pos) + newDate + html.substr(pos + len);
    }

    // Replace the entire HTML
    el.html(html);
}

$(function () {
    if ($('.gantt_hdr').length == 0)
        return;

    // Get the first month header of the Gantt chart
    var month = $('.gantt_hdr a').first().parent();

    // Get the text of the month: 2014-1 for example
    var desc = month.children('a').text();

    // Split it into year-month
    var parts = desc.match(/([0-9]{4})-([0-9]+)/);

    // Unusable
    if (!parts)
        return;

    // Extract the two parts
    var nYear = parts[2];
    var nMonth = parts[2];

    // Get the number of days in that month/year
    var nDays = new Date(nYear, nMonth, 0).getDate();

    // Calculate the width of each day
    var day_width = month.width() / nDays;

    $('div.tooltip').draggable({
        axis: 'x',
        grid: [day_width, 0],
        start: function (event, ui)
        {
            var sp = $('#gantt_area').scrollLeft();
            var task = $(this).prevUntil('.tooltip');
            task.each(function () {
                var $t = $(this);
                $t.data('left', $t.position().left + sp);
            });

            $(this).data('start_pos', ui.position);
        },
        drag: function (event, ui)
        {
            var start_pos = $(this).data('start_pos');
            var diff = ui.position.left - start_pos.left;
            var task = $(this).prevUntil('.tooltip');

            var days = Math.round(diff / day_width);
            updateDates($(this), days);

            task.each(function () {
                var $t = $(this);
                var l = $t.data('left') + diff;
                $t.css('left', l + 'px');

                if ($t.hasClass('task_todo'))
                    return false;
            });
        },
        stop: function (event, ui)
        {
             var $t = $(this);
            var start_pos = $t.data('start_pos');
            var diff = ui.position.left - start_pos.left;
            var days = Math.round(diff / day_width);

            $t.removeData('start_pos');
            $t.removeData('orig_html');

            // Acquire Issue ID
            var url = $(this).find('a.issue').attr('href');
            url += '/move';

            // Send update to server
            $.post(url, {days: days, authenticity_token: AUTH_TOKEN},
                    function (response) {
                        response = response[0];
                        if (response.status == "ok")
                        {
                            console.log("Issue moved to " + response.start_date + "-" + response.due_date);
                        }
                        else
                        {
                            alert(response.error);
                        }
                    }, 
                    "json"
                )
                .error(function () {
                    alert('Saving issue failed!');      
                });
           
            // Update the Gantt chart to show the relations on the updated position
            drawGanttHandler();
        }
    });
});
