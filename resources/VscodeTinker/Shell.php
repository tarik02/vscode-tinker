<?php

namespace VscodeTinker;

use Psy\{
    Configuration,
    Shell as BaseShell
};

/**
 * Class Shell
 * @package VscodeTinker
 */
class Shell extends BaseShell
{
    /**
     * @var Bus
     */
    protected Bus $bus;

    /**
     * @var string|null
     */
    protected ?string $dumpScope = null;

    /**
     * @param Bus $bus
     * @param Configuration|null $config
     * @return void
     */
    public function __construct(Bus $bus, Configuration $config = null)
    {
        $this->bus = $bus;

        parent::__construct($config);
    }

    /**
     * @param mixed $val
     * @return string
     */
    protected function presentValue($val)
    {
        $this->bus->dump($val);

        return '$DUMP$';
    }

    /**
     * @param mixed $ret
     * @param bool $rawOutput
     * @return mixed
     */
    public function writeReturnValue($ret, $rawOutput = false)
    {
        $this->bus->pushScope('return-value');

        try {
            return parent::writeReturnValue($ret, $rawOutput);
        } finally {
            $this->bus->popScope();
        }
    }

    public function writeException(\Exception $e)
    {
        $this->bus->pushScope('exception');

        try {
            return parent::writeException($e);
        } finally {
            $this->bus->popScope();
        }
    }
}
