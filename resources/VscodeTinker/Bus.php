<?php

namespace VscodeTinker;

use Symfony\Component\VarDumper\Cloner\VarCloner;
use Symfony\Component\VarDumper\Dumper\HtmlDumper;

/**
 * Class Bus
 * @package VscodeTinker
 */
class Bus
{
    /**
     * @var resource
     */
    protected $outputResource;

    /**
     * @var string[]
     */
    protected $scopes = [];

    /**
     * @return void
     */
    public function __construct()
    {
        $this->outputResource = \fopen('php://stdout', 'wb');
    }

    /**
     * @param string $scope
     * @return void
     */
    public function pushScope(string $scope): void
    {
        $this->scopes[] = $scope;
    }

    /**
     * @return void
     */
    public function popScope(): void
    {
        \array_pop($this->scopes);
    }

    /**
     * @return string|null
     */
    public function currentScope(): ?string
    {
        return \count($this->scopes) > 0 ? $this->scopes[\count($this->scopes) - 1] : null;
    }

    /**
     * @param string $message
     * @return void
     */
    public function service(string $message): void
    {
        $this->doWrite([
            'type' => 'service',
            'message' => $message,
        ]);
    }

    /**
     * @param string $data
     * @return void
     */
    public function write(string $data): void
    {
        $this->doWrite([
            'type' => 'write',
            'scope' => $this->currentScope(),
            'data' => $data,
        ]);
    }

    /**
     * @param mixed $data
     * @return void
     */
    public function dump($data): void
    {
        $cloner = new VarCloner();
        $dumper = new HtmlDumper();

        $this->doWrite([
            'type' => 'dump',
            'scope' => $this->currentScope(),
            'data' => $dumper->dump($cloner->cloneVar($data), true),
        ]);
    }

    /**
     * @param mixed $data
     * @param mixed $context
     * @param int $clientId
     * @return void
     */
    public function dumpFromServer($data, array $context, int $clientId): void
    {
        $dumper = new HtmlDumper();

        $this->doWrite([
            'type' => 'dump-from-server',
            'data' => $dumper->dump($data, true),
            'context' => $context,
            'client_id' => $clientId,
        ]);
    }

    /**
     * @param array $data
     * @return void
     */
    protected function doWrite(array $data): void
    {
        \fwrite(
            $this->outputResource,
            \PHP_EOL . \json_encode($data) . \PHP_EOL
        );
    }
}
