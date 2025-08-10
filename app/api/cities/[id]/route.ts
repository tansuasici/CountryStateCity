import { NextRequest, NextResponse } from 'next/server';
import { DataService } from '@/lib/data';
import { ApiResponse, City } from '@/types';

/**
 * @swagger
 * /api/cities/{id}:
 *   get:
 *     summary: Get a city by ID
 *     tags: [Cities]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: City ID
 *     responses:
 *       200:
 *         description: Successfully retrieved city
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/City'
 *       404:
 *         description: City not found
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cityId = parseInt(id);

    if (isNaN(cityId)) {
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        error: 'Invalid city ID'
      };
      return NextResponse.json(response, { status: 400 });
    }

    const city = DataService.getCityById(cityId);

    if (!city) {
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        error: 'City not found'
      };
      return NextResponse.json(response, { status: 404 });
    }

    const response: ApiResponse<City> = {
      success: true,
      data: city,
      message: 'City retrieved successfully'
    };

    return NextResponse.json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      error: 'Failed to retrieve city'
    };
    return NextResponse.json(response, { status: 500 });
  }
}