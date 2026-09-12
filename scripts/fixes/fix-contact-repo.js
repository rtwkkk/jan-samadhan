const fs = require('fs');
let code = fs.readFileSync('src/lib/mongodb/repositories/ContactRepository.ts', 'utf8');
code = code.replace(
  /static async findMany\(accountId: string, filters: Record<string, any> = \{\}, limit: number = 50, skip: number = 0\): Promise<IContact\[\]> \{/g,
  "static async findMany(accountId: string, filters: Record<string, any> = {}, limit: number = 50, skip: number = 0, session?: ClientSession): Promise<IContact[]> {"
);
fs.writeFileSync('src/lib/mongodb/repositories/ContactRepository.ts', code);
