'use client';

import { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader, Button, Code, Accordion, AccordionItem } from '@heroui/react';
import { ChevronLeft, ChevronDown, Globe, Building, MapPin, BarChart3, ExternalLink } from 'lucide-react';

interface SwaggerSpec {
  info: {
    title: string;
    version: string;
    description: string;
  };
  paths: Record<string, any>;
  components: {
    schemas: Record<string, any>;
  };
}

export default function APIDocumentation() {
  const [swaggerSpec, setSwaggerSpec] = useState<SwaggerSpec | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/docs')
      .then(res => res.json())
      .then(data => {
        setSwaggerSpec(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading API docs:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="container mx-auto p-4">Yükleniyor...</div>;
  }

  if (!swaggerSpec) {
    return <div className="container mx-auto p-4">Failed to load API documentation.</div>;
  }

  const endpoints = Object.entries(swaggerSpec.paths);

  // Group endpoints by category
  const groupedEndpoints = {
    'Countries': endpoints.filter(([path]) => path.startsWith('/api/countries')),
    'States': endpoints.filter(([path]) => path.startsWith('/api/states')),
    'Cities': endpoints.filter(([path]) => path.startsWith('/api/cities')),
    'Statistics': endpoints.filter(([path]) => path.startsWith('/api/stats'))
  };

  const renderEndpoint = (path: string, methods: any) => (
    <div key={path} className="mb-4">
      {Object.entries(methods).map(([method, details]: [string, any]) => (
        <div key={method} className="border rounded-lg p-4 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex items-center gap-3 mb-3">
            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
              method === 'get' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
              method === 'post' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
              method === 'put' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
              'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
            }`}>
              {method}
            </span>
            <Code size="sm" className="font-mono">{path}</Code>
            <span className="font-semibold text-gray-700 dark:text-gray-300">{details.summary}</span>
          </div>
          
          <p className="text-gray-600 dark:text-gray-300 mb-3">{details.description || 'Açıklama mevcut değil'}</p>
          
          {details.parameters && details.parameters.length > 0 && (
            <div className="mb-3">
              <h4 className="font-semibold mb-2">Parameters:</h4>
              <div className="space-y-2">
                {details.parameters.map((param: any, idx: number) => (
                  <div key={idx} className="bg-gray-100 dark:bg-gray-700 p-2 rounded text-sm">
                    <div className="flex items-center gap-2">
                      <Code size="sm" color="primary">{param.name}</Code>
                      <span className="text-xs bg-gray-200 dark:bg-gray-600 px-1 rounded">{param.in}</span>
                      {param.required && <span className="text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 px-1 rounded">Required</span>}
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">{param.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mb-3">
            <h4 className="font-semibold mb-2">Sample Request:</h4>
            <Code className="block p-2" size="sm">
              curl -X {method.toUpperCase()} "http://localhost:3003{path}"
            </Code>
          </div>

          <div>
            <Button 
              size="sm" 
              color="primary"
              variant="flat"
              startContent={<ExternalLink size={16} />}
              onPress={() => {
                const url = `http://localhost:3003${path}`;
                window.open(url, '_blank');
              }}
            >
              Test in Browser
            </Button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <div>
            <h1 className="text-3xl font-bold">{swaggerSpec.info.title}</h1>
            <p className="text-gray-600 mt-2">{swaggerSpec.info.description}</p>
            <p className="text-sm text-gray-500 mt-1">Version: {swaggerSpec.info.version}</p>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-blue-50 dark:bg-blue-950/20">
              <CardBody className="text-center">
                <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-300">Base URL</h3>
                <Code size="sm">http://localhost:3003</Code>
              </CardBody>
            </Card>
            <Card className="bg-green-50 dark:bg-green-950/20">
              <CardBody className="text-center">
                <h3 className="text-lg font-semibold text-green-700 dark:text-green-300">Response Format</h3>
                <Code size="sm">application/json</Code>
              </CardBody>
            </Card>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-2xl font-bold">API Endpoints</h2>
        </CardHeader>
        <CardBody>
          <Accordion variant="splitted" selectionMode="multiple" defaultExpandedKeys={["0", "1", "2", "3"]}>
            {Object.entries(groupedEndpoints).map(([category, categoryEndpoints], index) => (
              <AccordionItem 
                key={index.toString()}
                aria-label={category}
                title={
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      category === 'Countries' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                      category === 'States' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' :
                      category === 'Cities' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' :
                      'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                    }`}>
                      {category === 'Countries' ? <Globe size={20} /> : 
                       category === 'States' ? <Building size={20} /> : 
                       category === 'Cities' ? <MapPin size={20} /> : <BarChart3 size={20} />}
                    </div>
                    <span className="font-semibold text-lg">{category}</span>
                    <span className="text-sm text-gray-500">({categoryEndpoints.length} endpoints)</span>
                  </div>
                }
                indicator={({ isOpen }) => (
                  <div className="transition-all duration-300">
                    {isOpen ? <ChevronDown size={16} /> : <ChevronLeft size={16} />}
                  </div>
                )}
                className="mb-2"
              >
                <div className="space-y-4">
                  {categoryEndpoints.map(([path, methods]) => renderEndpoint(path, methods))}
                </div>
              </AccordionItem>
            ))}
          </Accordion>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Veri Modelleri</h2>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(swaggerSpec.components.schemas).map(([name, schema]: [string, any]) => (
              <Card key={name} className="bg-gray-50 dark:bg-gray-800">
                <CardHeader>
                  <h3 className="font-semibold">{name}</h3>
                </CardHeader>
                <CardBody>
                  <div className="text-sm space-y-1">
                    {schema.properties && Object.entries(schema.properties).map(([prop, details]: [string, any]) => (
                      <div key={prop} className="flex justify-between">
                        <Code size="sm">{prop}</Code>
                        <span className="text-gray-500">{details.type}</span>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}