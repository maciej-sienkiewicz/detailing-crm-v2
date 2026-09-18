// src/modules/products/hooks/useProducts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi, visitProductsApi } from '../api/productsApi';
import type {
    ProductListFilters,
    CreateProductRequest,
    UpdateProductRequest,
    UpdateProductStudioRequest,
    ProductDraft,
} from '../types';

const KEY = 'products';

/**
 * @param options.enabled `false` wstrzymuje zapytanie. Potrzebne tam, gdzie katalogu
 *   może w ogóle nie być pod ręką (studio bez modułu produktów) — bez tego lista
 *   strzelałaby po 403 i wywalała globalny toast przy każdym wpisanym znaku.
 */
export const useProducts = (filters: ProductListFilters, options?: { enabled?: boolean }) => {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: [KEY, 'list', filters],
        queryFn: () => productsApi.list(filters),
        enabled: options?.enabled ?? true,
    });
    return {
        products: data?.products ?? [],
        pagination: data?.pagination,
        isLoading,
        isError,
        refetch,
    };
};

export const useProductDetail = (id: string | undefined) => {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: [KEY, 'detail', id],
        queryFn: () => productsApi.get(id!),
        enabled: !!id,
    });
    return { product: data, isLoading, isError, refetch };
};

export const useCreateProduct = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (req: CreateProductRequest) => productsApi.create(req),
        onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
    });
};

export const useCreateFromDraft = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (draft: ProductDraft) => productsApi.createFromDraft(draft),
        onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
    });
};

export const useUpdateProduct = (id: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (req: UpdateProductRequest) => productsApi.update(id, req),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: [KEY, 'detail', id] });
            qc.invalidateQueries({ queryKey: [KEY, 'list'] });
        },
    });
};

export const useUpdateProductStudio = (id: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (req: UpdateProductStudioRequest) => productsApi.updateStudio(id, req),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: [KEY, 'detail', id] });
            qc.invalidateQueries({ queryKey: [KEY, 'list'] });
        },
    });
};

export const useConfirmProduct = (id: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => productsApi.confirm(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, 'detail', id] }),
    });
};

export const useProductLookup = () =>
    useMutation({ mutationFn: (barcode: string) => productsApi.lookup(barcode) });

// ── Notatki ──
export const useProductNotes = (id: string | undefined) => {
    const qc = useQueryClient();
    const query = useQuery({
        queryKey: [KEY, 'notes', id],
        queryFn: () => productsApi.listNotes(id!),
        enabled: !!id,
    });
    const invalidate = () => {
        qc.invalidateQueries({ queryKey: [KEY, 'notes', id] });
        qc.invalidateQueries({ queryKey: [KEY, 'detail', id] });
    };
    const add = useMutation({
        mutationFn: ({ content, visitId }: { content: string; visitId?: string }) =>
            productsApi.addNote(id!, content, visitId),
        onSuccess: invalidate,
    });
    const edit = useMutation({
        mutationFn: ({ noteId, content }: { noteId: string; content: string }) =>
            productsApi.editNote(id!, noteId, content),
        onSuccess: invalidate,
    });
    const remove = useMutation({
        mutationFn: (noteId: string) => productsApi.deleteNote(id!, noteId),
        onSuccess: invalidate,
    });
    return { notes: query.data ?? [], isLoading: query.isLoading, add, edit, remove };
};

// ── Ocena ──
export const useProductRating = (id: string) => {
    const qc = useQueryClient();
    const invalidate = () => qc.invalidateQueries({ queryKey: [KEY, 'detail', id] });
    const set = useMutation({
        mutationFn: ({ rating, justification }: { rating: number; justification?: string }) =>
            productsApi.setRating(id, rating, justification),
        onSuccess: invalidate,
    });
    const clear = useMutation({
        mutationFn: () => productsApi.clearRating(id),
        onSuccess: invalidate,
    });
    return { set, clear };
};

/** Lista „Wykorzystano podczas wizyty" — stronicowana i z wyszukiwarką. */
export const useProductVisits = (
    id: string | undefined,
    params: { search: string; page: number; limit: number },
) => {
    const { data, isLoading, isError } = useQuery({
        queryKey: [KEY, 'visits', id, params],
        queryFn: () => productsApi.productVisits(id!, params),
        enabled: !!id,
        placeholderData: previous => previous,
    });
    return {
        items: data?.items ?? [],
        totalItems: data?.totalItems ?? 0,
        totalPages: data?.totalPages ?? 0,
        currentPage: data?.currentPage ?? params.page,
        isLoading,
        isError,
    };
};

// ── Powiązania z wizytą ──
export const useVisitProducts = (visitId: string | undefined) => {
    const qc = useQueryClient();
    const query = useQuery({
        queryKey: ['visit-products', visitId],
        queryFn: () => visitProductsApi.list(visitId!),
        enabled: !!visitId,
    });
    const invalidate = () => qc.invalidateQueries({ queryKey: ['visit-products', visitId] });
    const link = useMutation({
        mutationFn: ({ productId, note }: { productId: string; note?: string }) =>
            visitProductsApi.link(visitId!, productId, note),
        onSuccess: invalidate,
    });
    const unlink = useMutation({
        mutationFn: (linkId: string) => visitProductsApi.unlink(visitId!, linkId),
        onSuccess: invalidate,
    });
    return { links: query.data ?? [], isLoading: query.isLoading, link, unlink };
};
