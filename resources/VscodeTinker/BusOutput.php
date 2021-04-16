<?php

namespace VscodeTinker;

use Symfony\Component\Console\Output\Output;

/**
 * Class BusOutput
 * @package VscodeTinker
 */
class BusOutput extends Output
{
    protected Bus $bus;

    /**
     * @param Bus $bus
     * @return void
     */
    public function __construct(Bus $bus)
    {
        parent::__construct();

        $this->bus = $bus;
    }

    /**
     * @param mixed $message
     * @param mixed $newline
     * @return void
     */
    protected function doWrite($message, $newline)
    {
        if ($newline) {
            $message .= PHP_EOL;
        }

        $this->bus->write($message);
    }
}
