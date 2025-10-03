import { cryptoService } from '../src/services/crypto.service.js';

console.log('Secret:');
console.log(cryptoService.generateSecret());
