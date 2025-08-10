import { NextResponse } from 'next/server';
import { DataService } from '@/lib/data';
import { ApiResponse } from '@/types';

/**
 * @swagger
 * /api/stats:
 *   get:
 *     summary: Get statistics about the data
 *     tags: [Statistics]
 *     responses:
 *       200:
 *         description: Successfully retrieved statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalCountries:
 *                       type: integer
 *                     totalStates:
 *                       type: integer
 *                     totalCities:
 *                       type: integer
 */
export async function GET() {
  try {
    const stats = DataService.getStats();

    const response: ApiResponse<typeof stats> = {
      success: true,
      data: stats,
      message: 'Statistics retrieved successfully'
    };

    return NextResponse.json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      error: 'Failed to retrieve statistics'
    };
    return NextResponse.json(response, { status: 500 });
  }
}