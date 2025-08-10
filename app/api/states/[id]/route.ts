import { NextRequest, NextResponse } from 'next/server';
import { DataService } from '@/lib/data';
import { ApiResponse, State } from '@/types';

/**
 * @swagger
 * /api/states/{id}:
 *   get:
 *     summary: Get a state by ID
 *     tags: [States]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: State ID
 *     responses:
 *       200:
 *         description: Successfully retrieved state
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/State'
 *       404:
 *         description: State not found
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const stateId = parseInt(id);

    if (isNaN(stateId)) {
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        error: 'Invalid state ID'
      };
      return NextResponse.json(response, { status: 400 });
    }

    const state = DataService.getStateById(stateId);

    if (!state) {
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        error: 'State not found'
      };
      return NextResponse.json(response, { status: 404 });
    }

    const response: ApiResponse<State> = {
      success: true,
      data: state,
      message: 'State retrieved successfully'
    };

    return NextResponse.json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      error: 'Failed to retrieve state'
    };
    return NextResponse.json(response, { status: 500 });
  }
}