<?php
$issues = array(
    "issues" => array(
        array(
            'id' => 1,
            'name' => 'Issue #1',
            'project' => 'Abot1',
            'start_date' => '2014-05-10',
            'due_date' => '2014-05-13'
        ),
        array(
            'id' => 2,
            'name' => 'Issue #2',
            'project' => 'Abot1',
            'start_date' => '2014-05-13',
            'due_date' => '2014-05-15',
        ),
        array(
            'id' => 9,
            'name' => 'Issue #9',
            'project' => 'Abot1',
            'start_date' => '2014-05-20',
            'due_date' => '2014-05-25',
        ),
        array(
            'id' => 8,
            'name' => 'Issue #8',
            'project' => 'Abot1',
            'start_date' => '2014-05-22',
            'due_date' => '2014-05-28',
        ),
        array(
            'id' => 10,
            'name' => 'Issue #10',
            'project' => 'Abot1',
            'start_date' => '2014-05-30',
            'due_date' => '2014-06-03',
        ),
        array(
            'id' => 3,
            'name' => 'Issue #3',
            'project' => 'Abot1',
            'start_date' => '2014-05-12',
            'due_date' => '2014-05-14'
        ),
        array(
            'id' => 4,
            'name' => 'Issue #4',
            'project' => 'Abot1',
            'start_date' => '2014-05-15',
            'due_date' => '2014-05-18'
        )
    ),
    "relations" => array(
        array(
            "id" => 1,
            "from" => 1,
            "to" => 2,
            "type" => "blocks"
        ),
        array(
            "id" => 2,
            "from" => 3,
            "to" => 4,
            "type" => "precedes"
        ),
        array(
            "id" => 3,
            "from" => 2,
            "to" => 8,
            "type" => "precedes"
        ),
        array(
            "id" => 4,
            "from" => 2,
            "to" => 9,
            "type" => "precedes"
        ),
        array(
            "id" => 5,
            "from" => 8,
            "to" => 10,
            "type" => "precedes"
        )
    )
);

header('Content-Type: application/json');
header('Cache-Control: max-age=0');

die(json_encode($issues));
?>
