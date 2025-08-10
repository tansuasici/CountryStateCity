import { NextRequest, NextResponse } from 'next/server';
import { DataService } from '@/lib/data';
import { ApiResponse, City } from '@/types';

/**
 * @swagger
 * /api/states/{id}/cities:
 *   get:
 *     summary: Get all cities for a specific state
 *     tags: [Cities]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: State ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for city name
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
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const stateId = parseInt(id);
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');

    if (isNaN(stateId)) {
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        error: 'Invalid state ID'
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Verify state exists
    const state = DataService.getStateById(stateId);
    if (!state) {
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        error: 'State not found'
      };
      return NextResponse.json(response, { status: 404 });
    }

    let cities: City[];

    if (search) {
      cities = DataService.searchCities(search, stateId);
    } else {
      cities = DataService.getCitiesByStateId(stateId);
    }

    const response: ApiResponse<City[]> = {
      success: true,
      data: cities,
      message: `Retrieved ${cities.length} cities for ${state.name}`
    };

    return NextResponse.json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      error: 'Failed to retrieve cities'
    };
    return NextResponse.json(response, { status: 500 });
  }
}