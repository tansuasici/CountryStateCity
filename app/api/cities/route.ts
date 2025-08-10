import { NextRequest, NextResponse } from 'next/server';
import { DataService } from '@/lib/data';
import { ApiResponse, City } from '@/types';

/**
 * @swagger
 * /api/cities:
 *   get:
 *     summary: Get all cities or search cities
 *     tags: [Cities]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for city name
 *       - in: query
 *         name: stateId
 *         schema:
 *           type: integer
 *         description: Filter by state ID
 *       - in: query
 *         name: countryId
 *         schema:
 *           type: integer
 *         description: Filter by country ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Limit the number of results
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *         description: Offset for pagination
 *     responses:
 *       200:
 *         description: Successfully retrieved cities
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/City'
 *                 total:
 *                   type: integer
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const stateId = searchParams.get('stateId') ? parseInt(searchParams.get('stateId')!) : undefined;
    const countryId = searchParams.get('countryId') ? parseInt(searchParams.get('countryId')!) : undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;

    let cities: City[];

    if (search) {
      cities = DataService.searchCities(search, stateId, countryId);
    } else if (stateId) {
      cities = DataService.getCitiesByStateId(stateId);
    } else if (countryId) {
      cities = DataService.getCitiesByCountryId(countryId);
    } else {
      // For performance, limit all cities query
      cities = DataService.searchCities('').slice(0, 1000);
    }

    const total = cities.length;
    
    if (limit) {
      cities = cities.slice(offset, offset + limit);
    }

    const response: ApiResponse<City[]> = {
      success: true,
      data: cities,
      message: `Retrieved ${cities.length} cities`
    };

    return NextResponse.json({ ...response, total });
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      error: 'Failed to retrieve cities'
    };
    return NextResponse.json(response, { status: 500 });
  }
}