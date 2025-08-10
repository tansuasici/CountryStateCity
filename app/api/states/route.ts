import { NextRequest, NextResponse } from 'next/server';
import { DataService } from '@/lib/data';
import { ApiResponse, State } from '@/types';

/**
 * @swagger
 * /api/states:
 *   get:
 *     summary: Get all states or search states
 *     tags: [States]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for state name
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
 *         description: Successfully retrieved states
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
 *                     $ref: '#/components/schemas/State'
 *                 total:
 *                   type: integer
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const countryId = searchParams.get('countryId') ? parseInt(searchParams.get('countryId')!) : undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;

    let states: State[];

    if (search) {
      states = DataService.searchStates(search, countryId);
    } else if (countryId) {
      states = DataService.getStatesByCountryId(countryId);
    } else {
      states = DataService.getAllCountries().length > 0 ? [] : []; // Return empty for performance
      states = DataService.searchStates(''); // This will return all states
    }

    const total = states.length;
    
    if (limit) {
      states = states.slice(offset, offset + limit);
    }

    const response: ApiResponse<State[]> = {
      success: true,
      data: states,
      message: `Retrieved ${states.length} states`
    };

    return NextResponse.json({ ...response, total });
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      error: 'Failed to retrieve states'
    };
    return NextResponse.json(response, { status: 500 });
  }
}