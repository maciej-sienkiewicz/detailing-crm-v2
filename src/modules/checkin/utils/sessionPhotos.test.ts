import { describe, expect, it } from 'vitest';
import { withLocalTags } from './sessionPhotos';

describe('withLocalTags', () => {
    it('keeps tags typed in the photo step when the session list refreshes', () => {
        const current = [{ id: 'a', fileName: 'a.jpg', uploadedAt: '2026-10-01T10:00:00Z', tags: ['przód', 'PPF'] }];
        const fresh = [
            { id: 'a', fileName: 'a.jpg', uploadedAt: '2026-10-01T10:00:00Z', thumbnailUrl: 'https://s3/a' },
            { id: 'b', fileName: 'b.jpg', uploadedAt: '2026-10-01T10:01:00Z', thumbnailUrl: 'https://s3/b' },
        ];

        const merged = withLocalTags(fresh, current);

        expect(merged[0]).toEqual({ ...fresh[0], tags: ['przód', 'PPF'] });
        expect(merged[1].tags).toBeUndefined();
    });

    it('does not resurrect photos that left the session', () => {
        const current = [{ id: 'gone', fileName: 'x.jpg', uploadedAt: '2026-10-01T10:00:00Z', tags: ['tył'] }];
        expect(withLocalTags([], current)).toEqual([]);
    });
});
