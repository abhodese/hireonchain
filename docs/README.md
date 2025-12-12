# Auto-Generate Swagger Documentation

## How It Works

1. **Parser Script** scans Express route files using glob patterns
2. **Regex extraction** finds all `router.get()`, `router.post()`, etc. definitions
3. **Swagger spec generation** creates OpenAPI 3.0 JSON from discovered routes
4. **Swagger UI** serves interactive documentation from the generated JSON

## Setup

### Install Dependencies
```bash
npm install swagger-ui-express
npm install --save-dev glob
```

### Create Generator Script
**`scripts/server.js`**
```javascript
const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

function extractRoutes(content, file) {
  const routes = [];
  const routeRegex = /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g;
  
  let match;
  while ((match = routeRegex.exec(content)) !== null) {
    routes.push({
      method: match[1],
      path: match[2],
      file: file.replace('src/', '').replace(/\.(ts|js)$/, '')
    });
  }
  return routes;
}

function generateSwaggerSpec(routes) {
  const paths = {};
  
  routes.forEach(route => {
    if (!paths[route.path]) paths[route.path] = {};
    
    const tag = route.file.split('/')[0] || 'default';
    
    paths[route.path][route.method] = {
      tags: [tag],
      summary: `${route.method.toUpperCase()} ${route.path}`,
      responses: {
        '200': { description: 'Success' }
      }
    };
    
    if (['post', 'put', 'patch'].includes(route.method)) {
      paths[route.path][route.method].requestBody = {
        required: true,
        content: {
          'application/json': {
            schema: { type: 'object' }
          }
        }
      };
    }
  });
  
  return {
    openapi: '3.0.0',
    info: {
      title: 'API Documentation',
      version: '1.0.0',
      description: 'Auto-generated from Express routes'
    },
    paths
  };
}

async function main() {
  const rootDir = path.resolve(__dirname, '..');
  const files = await glob(`${rootDir}/server/src/**/{routes,controllers}/**/*.js`);
  
  let allRoutes = [];
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    allRoutes = allRoutes.concat(extractRoutes(content, file));
  }
  
  const spec = generateSwaggerSpec(allRoutes);
  fs.writeFileSync(path.join(__dirname, 'swagger.json'), JSON.stringify(spec, null, 2));
  console.log(`✓ Generated docs for ${allRoutes.length} routes`);
}

main();
```

### Add to Express App
**`server/server.js`**
```javascript
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerDoc = require('../docs/swagger.json');

const app = express();

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));

// Your routes...
app.listen(3000);
```

### Package.json
**`package.json`** (root)
```json
{
  "name": "api-server",
  "version": "1.0.0",
  "type": "commonjs",
  "scripts": {
    "gen:docs": "node api-docs.js",
    "start": "npm run gen:docs && node ../server/server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "swagger-ui-express": "^5.0.0"
  },
  "devDependencies": {
    "glob": "^10.3.10"
  }
}
```

## Usage

```bash
# Generate documentation
npm run gen:docs

# View docs
# Start server then visit: http://localhost:3000/api/docs
```

## Notes

- Runs before server starts to keep docs in sync
- No comments needed in route files
- Customize `filesPattern` in script for your folder structure
- Regenerate whenever routes change