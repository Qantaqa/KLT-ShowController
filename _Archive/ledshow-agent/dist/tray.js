import SysTray from 'systray2';
import { PlayerService } from './player.js';
import path from 'node:path';
import fs from 'node:fs';
export class TrayService {
    systray;
    player;
    constructor(player) {
        this.player = player;
    }
    async start() {
        // Read icon and convert to base64
        let iconBase64 = '';
        try {
            const iconPath = path.join(process.cwd(), '..', 'theater.ico');
            if (fs.existsSync(iconPath)) {
                iconBase64 = fs.readFileSync(iconPath).toString('base64');
            }
        }
        catch (e) {
            console.error('Failed to load tray icon:', e);
        }
        const menuItems = [
            {
                title: "Status Pagina",
                tooltip: "Open de status pagina in de browser",
                checked: false,
                enabled: true,
                click: () => {
                    import('open').then(op => op.default('http://localhost:3000'));
                }
            },
            {
                title: "Laatste Media Stoppen",
                tooltip: "Stop de huidige video afspelen",
                checked: false,
                enabled: true,
                click: () => {
                    this.player.stop();
                }
            },
            {
                title: "---",
                enabled: false
            },
            {
                title: "Afsluiten",
                tooltip: "Sluit de VideoWall Agent af",
                checked: false,
                enabled: true,
                click: () => {
                    console.log('Shutdown via Tray Icon');
                    process.exit(0);
                }
            }
        ];
        try {
            console.log('DEBUG: Initializing SysTray...');
            // In some ESM environments (like ts-node/esm), CJS default exports might need .default
            let SysTrayCtor = SysTray;
            if (SysTray.default) {
                SysTrayCtor = SysTray.default;
            }
            this.systray = new SysTrayCtor({
                menu: {
                    icon: iconBase64, // If empty, it might still work with title
                    title: "LedShow VideoWall Agent",
                    tooltip: "VideoWall Agent Actief",
                    items: menuItems
                },
                debug: false,
                copyDir: true
            });
            this.systray.onClick((action) => {
                if (action.item && action.item.click) {
                    action.item.click();
                }
            });
            console.log('DEBUG: SysTray initialized successfully');
        }
        catch (e) {
            console.error('FAILED TO INITIALIZE SYSTRAY:', e);
            // Don't crash the whole agent if tray fails
        }
        console.log('Tray Service started');
    }
    stop() {
        if (this.systray) {
            this.systray.kill();
        }
    }
}
//# sourceMappingURL=tray.js.map