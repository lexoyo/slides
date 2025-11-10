#!/bin/bash

# Development script
echo "Starting development environment..."
echo ""
echo "Building 11ty site..."
npm run build

echo ""
echo "Starting server..."
echo "Presentation: http://localhost:3000"
echo "Presenter View: http://localhost:3000/presenter"
echo "Default password: presenter123"
echo ""

npm start
