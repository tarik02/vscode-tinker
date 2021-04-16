<?php

$workspaceDir = getenv('WORKSPACE_DIR');

require $workspaceDir . '/vendor/autoload.php';

$tinkerCommandSource = file_get_contents($workspaceDir . '/vendor/laravel/tinker/src/Console/TinkerCommand.php');
$tinkerCommandSource = str_replace('class TinkerCommand extends Command', 'class OldTinkerCommand extends Command', $tinkerCommandSource);

$file = tempnam(sys_get_temp_dir(), 'TinkerCommand.php');
file_put_contents($file, $tinkerCommandSource);

include $file;

require __DIR__ . '/Bus.php';
require __DIR__ . '/BusOutput.php';
require __DIR__ . '/Shell.php';
require __DIR__ . '/TinkerCommand.php';

class_alias(\VscodeTinker\TinkerCommand::class, \Laravel\Tinker\Console\TinkerCommand::class);

require $workspaceDir . '/artisan';
