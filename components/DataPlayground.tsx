'use client';

import { useState, useEffect } from 'react';
import { 
  Card, 
  CardBody, 
  CardHeader, 
  Button, 
  Select, 
  SelectItem,
  Autocomplete,
  AutocompleteItem,
  Snippet
} from '@heroui/react';
import { 
  Play, 
  Copy, 
  Download,
  Globe,
  Building,
  MapPin
} from 'lucide-react';
import { Country, State, City } from '@/types';

interface DataPlaygroundProps {
  stats: {
    countries: number;
    states: number;
    cities: number;
  };
}

export default function DataPlayground({ stats }: DataPlaygroundProps) {
  const [selectedAction, setSelectedAction] = useState('getCountries');
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedFormat, setSelectedFormat] = useState('json');
  const [result, setResult] = useState<string>('');
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadCountries = async () => {
      const { default: CountryStateCity } = await import('@tansuasici/country-state-city');
      const data = CountryStateCity.getAllCountries() as Country[];
      setCountries(data);
    };
    loadCountries();
  }, []);

  useEffect(() => {
    if (selectedCountry) {
      const loadStates = async () => {
        const { default: CountryStateCity } = await import('@tansuasici/country-state-city');
        const data = CountryStateCity.getStatesByCountryId(Number(selectedCountry)) as State[];
        setStates(data);
        setSelectedState('');
      };
      loadStates();
    } else {
      setStates([]);
      setSelectedState('');
    }
  }, [selectedCountry]);

  const executeAction = async () => {
    setLoading(true);
    try {
      const { default: CountryStateCity } = await import('@tansuasici/country-state-city');
      
      const {
        formatCountries,
        formatStates,
        formatCities
      } = await import('@/lib/formatters');

      let data: any;
      
      switch (selectedAction) {
        case 'getCountries':
          data = (CountryStateCity.getAllCountries() as Country[]).slice(0, 10); // Get first 10 countries
          break;
        case 'getCountryById':
          if (selectedCountry) {
            data = CountryStateCity.getCountryById(Number(selectedCountry));
          }
          break;
        case 'getStatesByCountryId':
          if (selectedCountry) {
            data = (CountryStateCity.getStatesByCountryId(Number(selectedCountry)) as State[]).slice(0, 20);
          }
          break;
        case 'getCitiesByStateId':
          if (selectedState) {
            data = (CountryStateCity.getCitiesByStateId(Number(selectedState)) as City[]).slice(0, 20);
          }
          break;
        case 'searchCountries':
          data = CountryStateCity.searchCountries('United').slice(0, 10);
          break;
        default:
          data = { message: 'Select an action to execute' };
      }

      // Format the data based on selected format
      let formattedResult: string;
      
      // Ensure data is an array for formatting functions
      const dataArray = Array.isArray(data) ? data : [data];
      
      if (selectedFormat === 'json') {
        formattedResult = JSON.stringify(data, null, 2);
      } else if (selectedFormat === 'csv') {
        if (selectedAction.includes('Countries') || selectedAction.includes('Country')) {
          formattedResult = formatCountries.csv(dataArray);
        } else if (selectedAction.includes('States') || selectedAction.includes('State')) {
          formattedResult = formatStates.csv(dataArray);
        } else {
          formattedResult = formatCities.csv(dataArray);
        }
      } else if (selectedFormat === 'xml') {
        if (selectedAction.includes('Countries') || selectedAction.includes('Country')) {
          formattedResult = formatCountries.xml(dataArray);
        } else if (selectedAction.includes('States') || selectedAction.includes('State')) {
          formattedResult = formatStates.xml(dataArray);
        } else {
          formattedResult = formatCities.xml(dataArray);
        }
      } else if (selectedFormat === 'yaml') {
        if (selectedAction.includes('Countries') || selectedAction.includes('Country')) {
          formattedResult = formatCountries.yaml(dataArray);
        } else if (selectedAction.includes('States') || selectedAction.includes('State')) {
          formattedResult = formatStates.yaml(dataArray);
        } else {
          formattedResult = formatCities.yaml(dataArray);
        }
      } else {
        formattedResult = JSON.stringify(data, null, 2);
      }

      setResult(formattedResult);
    } catch (error) {
      setResult(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const copyResult = () => {
    navigator.clipboard.writeText(result);
  };

  const downloadResult = () => {
    const blob = new Blob([result], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `data.${selectedFormat}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const actionOptions = [
    { key: 'getCountries', label: 'Get Countries (First 10)', icon: Globe },
    { key: 'getCountryById', label: 'Get Country by ID', icon: Globe },
    { key: 'getStatesByCountryId', label: 'Get States by Country', icon: Building },
    { key: 'getCitiesByStateId', label: 'Get Cities by State', icon: MapPin },
  ];

  const formatOptions = [
    { key: 'json', label: 'JSON' },
    { key: 'csv', label: 'CSV' },
    { key: 'xml', label: 'XML' },
    { key: 'yaml', label: 'YAML' }
  ];

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Select 
          label="Action" 
          placeholder="Select action"
          selectedKeys={[selectedAction]}
          onSelectionChange={(keys) => setSelectedAction(Array.from(keys)[0] as string)}
        >
          {actionOptions.map((option) => (
            <SelectItem key={option.key} textValue={option.label}>
              <div className="flex items-center gap-2">
                <option.icon size={16} />
                {option.label}
              </div>
            </SelectItem>
          ))}
        </Select>

        {(selectedAction === 'getCountryById' || selectedAction === 'getStatesByCountryId') && (
          <Autocomplete 
            label="Country" 
            placeholder="Search countries..."
            selectedKey={selectedCountry || null}
            onSelectionChange={(key) => setSelectedCountry(key?.toString() || '')}
          >
            {countries.map((country) => (
              <AutocompleteItem 
                key={country.id.toString()} 
                textValue={country.name}
                startContent={<span className="text-lg">{country.emoji}</span>}
              >
                {country.name}
              </AutocompleteItem>
            ))}
          </Autocomplete>
        )}

        {selectedAction === 'getCitiesByStateId' && (
          <>
            <Autocomplete 
              label="Country" 
              placeholder="Search countries..."
              selectedKey={selectedCountry || null}
              onSelectionChange={(key) => setSelectedCountry(key?.toString() || '')}
            >
              {countries.map((country) => (
                <AutocompleteItem 
                  key={country.id.toString()} 
                  textValue={country.name}
                  startContent={<span className="text-lg">{country.emoji}</span>}
                >
                  {country.name}
                </AutocompleteItem>
              ))}
            </Autocomplete>
            <Autocomplete 
              label="State" 
              placeholder="Search states..."
              isDisabled={!selectedCountry}
              selectedKey={selectedState || null}
              onSelectionChange={(key) => setSelectedState(key?.toString() || '')}
            >
              {states.map((state) => (
                <AutocompleteItem key={state.id.toString()} textValue={state.name}>
                  {state.name}
                </AutocompleteItem>
              ))}
            </Autocomplete>
          </>
        )}

        <Select 
          label="Format" 
          placeholder="Select format"
          selectedKeys={[selectedFormat]}
          onSelectionChange={(keys) => setSelectedFormat(Array.from(keys)[0] as string)}
        >
          {formatOptions.map((option) => (
            <SelectItem key={option.key} textValue={option.label}>
              {option.label}
            </SelectItem>
          ))}
        </Select>
      </div>

      {/* Execute Button */}
      <div className="flex gap-2">
        <Button
          color="primary"
          startContent={<Play size={16} />}
          onPress={executeAction}
          isLoading={loading}
        >
          Execute
        </Button>
        
        {result && (
          <>
            <Button
              variant="flat"
              startContent={<Copy size={16} />}
              onPress={copyResult}
            >
              Copy
            </Button>
            <Button
              variant="flat"
              startContent={<Download size={16} />}
              onPress={downloadResult}
            >
              Download
            </Button>
          </>
        )}
      </div>

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Result</h3>
          </CardHeader>
          <CardBody>
            <Snippet 
              hideSymbol
              className="w-full max-w-full"
              codeString={result}
            >
              <pre className="font-mono text-sm max-h-[400px] overflow-auto whitespace-pre-wrap break-all">
                {result}
              </pre>
            </Snippet>
          </CardBody>
        </Card>
      )}

    </div>
  );
}