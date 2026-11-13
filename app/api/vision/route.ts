import { NextRequest, NextResponse } from 'next/server';
import type { VisionApiRequest, VisionApiResponse } from '@/types/echo';
import { analyzeSupplyImage, buildProposal, toLegacyVisionResult, validateImageDataUrl } from '@/lib/ai/vision';
import { ProviderError } from '@/lib/ai/openai';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * POST /api/vision — photo → validated, editable proposal. NEVER mutates inventory.
 * Dev-only: header `x-echo-test-output: <json>` injects raw model output to test validation.
 */
export async function POST(req: NextRequest) {
  let body: VisionApiRequest;
  try {
    body = await req.json();
  } catch {
    return err(400, 'invalid_request', 'Request body must be JSON.');
  }

  const bad = validateImageDataUrl(body?.image);
  if (bad) return err(400, 'invalid_request', bad);

  let testModelOutput: unknown;
  const testHeader = req.headers.get('x-echo-test-output');
  if (testHeader && process.env.NODE_ENV !== 'production') testModelOutput = testHeader;

  try {
    const r = await analyzeSupplyImage(body.image, { testModelOutput });
    if (!r.ok) return err(502, r.error.code, r.error.message, r.mock);

    const proposal = buildProposal(r.value);
    const result = toLegacyVisionResult(proposal);
    return NextResponse.json<VisionApiResponse>({
      success: true,
      proposal,
      result,
      proposedAction: result.suggestedAction,
      mock: r.mock,
    });
  } catch (e) {
    console.error('[API /api/vision]', e);
    const status = e instanceof ProviderError ? (e.status === 503 ? 503 : 502) : 500;
    return err(status, 'provider_error', 'Image analysis failed. Try another photo or retry in a moment.');
  }
}

function err(status: number, errorCode: VisionApiResponse['errorCode'], error: string, mock?: boolean) {
  return NextResponse.json<VisionApiResponse>({ success: false, error, errorCode, mock }, { status });
}
