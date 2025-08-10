import { NextRequest, NextResponse } from 'next/server';
import { DataService } from '@/lib/data';
import { ApiResponse, Country } from '@/types';

/**
 * @swagger
 * /api/countries/{id}:
 *   get:
 *     summary: Get a country by ID or code
 *     tags: [Countries]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Country ID or ISO code (ISO2/ISO3)
 *     responses:
 *       200:
 *         description: Successfully retrieved country
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Country'
 *       404:
 *         description: Country not found
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let country: Country | undefined;

    // Check if id is numeric
    const numericId = parseInt(id);
    if (!isNaN(numericId)) {
      country = DataService.getCountryById(numericId);
    } else {
      // Assume it's an ISO code
      country = DataService.getCountryByCode(id);
    }

    if (!country) {
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        error: 'Country not found'
      };
      return NextResponse.json(response, { status: 404 });
    }

    const response: ApiResponse<Country> = {
      success: true,
      data: country,
      message: 'Country retrieved successfully'
    };

    return NextResponse.json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      error: 'Failed to retrieve country'
    };
    return NextResponse.json(response, { status: 500 });
  }
}