import dotenv from 'dotenv';
import { existsSync } from 'fs';

export function loadEnv() {
	if (existsSync('.env.local')) {
		dotenv.config({ path: '.env.local' });
	}
	dotenv.config();
}
