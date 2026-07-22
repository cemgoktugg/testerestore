import { defineRouteConfig } from "@medusajs/admin-sdk";
import { ChatBubble, CheckCircleSolid, Trash } from "@medusajs/icons";
import {
  Container,
  Heading,
  Text,
  Button,
  Badge,
  Select,
  Table,
  toast,
} from "@medusajs/ui";
import { useEffect, useMemo, useState } from "react";

interface Review {
  id: string;
  product_id: string;
  author_name: string;
  rating: number;
  title: string | null;
  body: string;
  is_approved: boolean;
  is_verified_purchase: boolean;
  created_at: string;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export default function ProductReviewsAdmin() {
  const [rows, setRows] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved">(
    "pending"
  );

  async function load() {
    setLoading(true);
    try {
      const data = await api<{ reviews: Review[] }>(
        `/admin/product-reviews?status=${filter}`
      );
      setRows(data.reviews);
    } catch (e) {
      toast.error("Yüklenemedi", { description: String(e) });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const pendingCount = useMemo(
    () => rows.filter((r) => !r.is_approved).length,
    [rows]
  );

  async function approve(id: string) {
    try {
      await api(`/admin/product-reviews/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_approved: true }),
      });
      toast.success("Onaylandı");
      load();
    } catch (e) {
      toast.error("Hata", { description: String(e) });
    }
  }

  async function reject(id: string) {
    if (!confirm("Bu yorumu silmek istediğinize emin misiniz?")) return;
    try {
      await api(`/admin/product-reviews/${id}`, { method: "DELETE" });
      toast.success("Silindi");
      load();
    } catch (e) {
      toast.error("Hata", { description: String(e) });
    }
  }

  return (
    <Container className="p-0">
      <div className="flex items-center justify-between px-6 py-4 border-b border-ui-border-base">
        <div>
          <Heading level="h1">Ürün Yorumları</Heading>
          <Text size="small" className="text-ui-fg-subtle mt-1">
            Müşteri yorumlarını incele, onayla veya sil.{" "}
            <strong>{pendingCount}</strong> onay bekliyor.
          </Text>
        </div>
        <Select
          value={filter}
          onValueChange={(v) => setFilter(v as "all" | "pending" | "approved")}
        >
          <Select.Trigger className="w-44">
            <Select.Value />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="pending">Onay Bekleyenler</Select.Item>
            <Select.Item value="approved">Onaylananlar</Select.Item>
            <Select.Item value="all">Tümü</Select.Item>
          </Select.Content>
        </Select>
      </div>

      <div className="px-6 py-4">
        {loading ? (
          <Text>Yükleniyor...</Text>
        ) : rows.length === 0 ? (
          <div className="text-center py-12 text-ui-fg-subtle">
            Bu filtreye uygun yorum yok.
          </div>
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Yazar</Table.HeaderCell>
                <Table.HeaderCell>Puan</Table.HeaderCell>
                <Table.HeaderCell>Yorum</Table.HeaderCell>
                <Table.HeaderCell>Ürün</Table.HeaderCell>
                <Table.HeaderCell>Tarih</Table.HeaderCell>
                <Table.HeaderCell>Durum</Table.HeaderCell>
                <Table.HeaderCell></Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {rows.map((r) => (
                <Table.Row key={r.id}>
                  <Table.Cell>
                    <div className="font-medium">{r.author_name}</div>
                    {r.is_verified_purchase && (
                      <Badge color="green" size="xsmall">
                        Doğrulanmış
                      </Badge>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    <span className="text-yellow-500">
                      {"★".repeat(Number(r.rating))}
                      <span className="text-ui-border-base">
                        {"★".repeat(5 - Number(r.rating))}
                      </span>
                    </span>
                  </Table.Cell>
                  <Table.Cell className="max-w-md">
                    {r.title && <div className="font-medium">{r.title}</div>}
                    <Text size="xsmall" className="text-ui-fg-subtle line-clamp-2">
                      {r.body}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="xsmall" className="font-mono">
                      {r.product_id.slice(-8)}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="xsmall" className="text-ui-fg-subtle">
                      {new Date(r.created_at).toLocaleDateString("tr-TR")}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    {r.is_approved ? (
                      <Badge color="green">Onaylandı</Badge>
                    ) : (
                      <Badge color="orange">Bekliyor</Badge>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center gap-1 justify-end">
                      {!r.is_approved && (
                        <Button
                          variant="transparent"
                          size="small"
                          onClick={() => approve(r.id)}
                        >
                          <CheckCircleSolid />
                        </Button>
                      )}
                      <Button
                        variant="transparent"
                        size="small"
                        onClick={() => reject(r.id)}
                      >
                        <Trash />
                      </Button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </div>
    </Container>
  );
}

export const config = defineRouteConfig({
  label: "Ürün Yorumları",
  icon: ChatBubble,
});
