<?php

use Symfony\Component\VarDumper\Cloner\Data;
use Symfony\Component\VarDumper\Server\DumpServer;
use VscodeTinker\Bus;

$workspaceDir = getenv('WORKSPACE_DIR');

require $workspaceDir . '/vendor/autoload.php';
require __DIR__ . '/Bus.php';

$bus = new Bus();

try {
    $server = new DumpServer('tcp://127.0.0.1:9912');

    $server->start();
} catch (Throwable $e) {
    dd($e);
    exit();
}

$bus->service('Dump server started.');

$server->listen(function (Data $data, array $context, int $clientId) use ($bus) {
    $bus->dumpFromServer($data, $context, $clientId);
});
