<?php

namespace VscodeTinker;

use Symfony\Component\VarDumper\VarDumper;

use Laravel\Tinker\{
    Console\OldTinkerCommand as BaseTinkerCommand,
    ClassAliasAutoloader
};
use Psy\{
    Configuration,
    ExecutionLoopClosure
};

/**
 * Class TinkerCommand
 * @package VscodeTinker
 */
class TinkerCommand extends BaseTinkerCommand
{
    /**
     * @var Bus
     */
    protected Bus $bus;

    /**
     * Execute the console command.
     *
     * @return void
     */
    public function handle()
    {
        $this->bus = new Bus();

        $this->getApplication()->setCatchExceptions(false);

        $config = new Configuration([
            'updateCheck' => 'never',
            'usePcntl' => false,
            'useReadline' => false,
            'prompt' => \json_encode([
                'type' => 'eof',
            ]) . \PHP_EOL,
        ]);

        $config->setColorMode(Configuration::COLOR_MODE_DISABLED);

        $config->getPresenter()->addCasters(
            $this->getCasters()
        );

        $config->setHistoryFile(\defined('PHP_WINDOWS_VERSION_BUILD') ? 'nul' : '/dev/null');

        $shell = new Shell($this->bus, $config);

        $shell->setOutput(
            new BusOutput($this->bus)
        );

        if (isset($_ENV['COMPOSER_VENDOR_DIR'])) {
            $path = $_ENV['COMPOSER_VENDOR_DIR'];
        } else {
            $path = $this->getLaravel()->basePath() . DIRECTORY_SEPARATOR . 'vendor';
        }

        $path .= '/composer/autoload_classmap.php';

        $loader = ClassAliasAutoloader::register($shell, $path);

        $code = array_reduce(
            \token_get_all(\file_get_contents('php://stdin')),
            function ($carry, $token) {
                if (\is_string($token)) {
                    return $carry . $token;
                }

                [$id, $text] = $token;

                if (\in_array($id, [T_COMMENT, T_DOC_COMMENT, T_OPEN_TAG, T_OPEN_TAG_WITH_ECHO, T_CLOSE_TAG], true)) {
                    $text = '';
                }

                return $carry . $text;
            },
            ''
        );

        $shell->addInput($code, true);

        try {
            $closure = new ExecutionLoopClosure($shell);

            $this->bus->service('Script started.');

            VarDumper::setHandler(function ($data) {
                $this->bus->dump($data);
            });

            $closure->execute();
        } finally {
            $loader->unregister();
        }
    }
}
