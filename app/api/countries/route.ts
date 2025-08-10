import { NextRequest, NextResponse } from 'next/server';
import { DataService } from '@/lib/data';
import { ApiResponse, Country } from '@/types';

/**
 * @swagger
 * /api/countries:
 *   get:
 *     summary: Get all countries or search countries
 *     tags: [Countries]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for country name, ISO2, or ISO3 code
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
 *         description: Successfully retrieved countries
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
 *                     $ref: '#/components/schemas/Country'
 *                 total:
 *                   type: integer
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;

    let countries: Country[];

    if (search) {
      countries = DataService.searchCountries(search);
    } else {
      countries = DataService.getAllCountries();
    }

    const total = countries.length;
    
    if (limit) {
      countries = countries.slice(offset, offset + limit);
    }

    const response: ApiResponse<Country[]> = {
      success: true,
      data: countries,
      message: `Retrieved ${countries.length} countries`
    };

    return NextResponse.json({ ...response, total });
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      error: 'Failed to retrieve countries'
    };
    return NextResponse.json(response, { status: 500 });
  }
}