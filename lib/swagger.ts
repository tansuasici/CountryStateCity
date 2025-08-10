import swaggerJSDoc from 'swagger-jsdoc';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Country State City API',
      version: '1.0.0',
      description: 'RESTful API for Country, State and City information',
      contact: {
        name: 'API Support',
        email: 'support@example.com',
      },
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://your-domain.com' 
          : 'http://localhost:3000',
        description: process.env.NODE_ENV === 'production' 
          ? 'Production server' 
          : 'Development server',
      },
    ],
    tags: [
      {
        name: 'Countries',
        description: 'Country operations',
      },
      {
        name: 'States',
        description: 'State operations',
      },
      {
        name: 'Cities',
        description: 'City operations',
      },
      {
        name: 'Statistics',
        description: 'Statistical information',
      },
    ],
    components: {
      schemas: {
        Country: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Country ID',
            },
            name: {
              type: 'string',
              description: 'Country name',
            },
            iso3: {
              type: 'string',
              description: 'ISO3 kodu',
            },
            iso2: {
              type: 'string',
              description: 'ISO2 kodu',
            },
            numericCode: {
              type: 'string',
              description: 'Sayısal kod',
            },
            phoneCode: {
              type: 'string',
              description: 'Telefon kodu',
            },
            capital: {
              type: 'string',
              description: 'Başkent',
            },
            currency: {
              type: 'string',
              description: 'Para birimi',
            },
            currencyName: {
              type: 'string',
              description: 'Para birimi adı',
            },
            currencySymbol: {
              type: 'string',
              description: 'Para birimi sembolü',
            },
            tld: {
              type: 'string',
              description: 'Top level domain',
            },
            native: {
              type: 'string',
              description: 'Yerel dildeki adı',
            },
            region: {
              type: 'string',
              description: 'Bölge',
            },
            regionId: {
              type: 'integer',
              description: 'Bölge ID\'si',
            },
            subregion: {
              type: 'string',
              description: 'Alt bölge',
            },
            subregionId: {
              type: 'integer',
              description: 'Alt bölge ID\'si',
            },
            nationality: {
              type: 'string',
              description: 'Milliyet',
            },
            latitude: {
              type: 'string',
              description: 'Enlem',
            },
            longitude: {
              type: 'string',
              description: 'Boylam',
            },
            emoji: {
              type: 'string',
              description: 'Bayrak emoji',
            },
            emojiU: {
              type: 'string',
              description: 'Unicode bayrak emoji',
            },
          },
        },
        State: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'İl ID\'si',
            },
            name: {
              type: 'string',
              description: 'İl adı',
            },
            countryId: {
              type: 'integer',
              description: 'Country ID',
            },
            countryCode: {
              type: 'string',
              description: 'Ülke kodu',
            },
            countryName: {
              type: 'string',
              description: 'Country name',
            },
            stateCode: {
              type: 'string',
              description: 'İl kodu',
            },
            type: {
              type: 'string',
              nullable: true,
              description: 'İl tipi',
            },
            latitude: {
              type: 'string',
              description: 'Enlem',
            },
            longitude: {
              type: 'string',
              description: 'Boylam',
            },
          },
        },
        City: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'İlçe ID\'si',
            },
            name: {
              type: 'string',
              description: 'İlçe adı',
            },
            stateId: {
              type: 'integer',
              description: 'İl ID\'si',
            },
            stateCode: {
              type: 'string',
              description: 'İl kodu',
            },
            stateName: {
              type: 'string',
              description: 'İl adı',
            },
            countryId: {
              type: 'integer',
              description: 'Country ID',
            },
            countryCode: {
              type: 'string',
              description: 'Ülke kodu',
            },
            countryName: {
              type: 'string',
              description: 'Country name',
            },
            latitude: {
              type: 'string',
              description: 'Enlem',
            },
            longitude: {
              type: 'string',
              description: 'Boylam',
            },
            wikiDataId: {
              type: 'string',
              description: 'WikiData ID',
            },
          },
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'İşlem başarılı mı',
            },
            data: {
              description: 'Dönen veri',
            },
            message: {
              type: 'string',
              description: 'Başarı mesajı',
            },
            error: {
              type: 'string',
              description: 'Hata mesajı',
            },
          },
        },
      },
    },
  },
  apis: ['./app/api/**/*.ts'],
};

export const swaggerSpec = swaggerJSDoc(options);