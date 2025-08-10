import { NextRequest, NextResponse } from 'next/server';
import { DataService } from '@/lib/data';
import { ApiResponse, State } from '@/types';

/**
 * @swagger
 * /api/countries/{id}/states:
 *   get:
 *     summary: Get all states for a specific country
 *     tags: [States]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Country ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for state name
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
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const countryId = parseInt(id);
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');

    if (isNaN(countryId)) {
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        error: 'Invalid country ID'
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Verify country exists
    const country = DataService.getCountryById(countryId);
    if (!country) {
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        error: 'Country not found'
      };
      return NextResponse.json(response, { status: 404 });
    }

    let states: State[];

    if (search) {
      states = DataService.searchStates(search, countryId);
    } else {
      states = DataService.getStatesByCountryId(countryId);
    }

    const response: ApiResponse<State[]> = {
      success: true,
      data: states,
      message: `Retrieved ${states.length} states for ${country.name}`
    };

    return NextResponse.json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      error: 'Failed to retrieve states'
    };
    return NextResponse.json(response, { status: 500 });
  }
}