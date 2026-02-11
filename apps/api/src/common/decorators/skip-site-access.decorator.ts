import { SetMetadata } from '@nestjs/common';
import { SKIP_SITE_ACCESS_CHECK } from '../guards/site-access.guard';

/**
 * Decorator to skip site access validation.
 * Use this on read-only endpoints where users should be able
 * to view data from any site.
 */
export const SkipSiteAccessCheck = () => SetMetadata(SKIP_SITE_ACCESS_CHECK, true);
