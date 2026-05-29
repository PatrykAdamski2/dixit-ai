import React, { useCallback, useEffect, useState } from 'react';
import { ImagePlus, Loader2, Palette } from 'lucide-react';
import { ViewPageShell } from '../components/ViewPageShell';
import { CardCanvasEditor } from '../components/CardCanvasEditor';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { ApiStateMessage } from '../components/ApiStateMessage';
import {
  fetchMyCards,
  saveCanvasCard,
  uploadCard,
  type UserCard,
} from '../services/api';
import { notifyError, notifySuccess } from '../services/socketNotify';

function parseTags(raw: string): string[] {
  return raw
    .split(/[,;]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 20);
}

export function MyCardsView() {
  const [cards, setCards] = useState<UserCard[]>([]);
  const [tagsInput, setTagsInput] = useState('');
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const loadCards = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMyCards();
      setCards(data);
    } catch {
      notifyError('Nie udało się pobrać Twoich kart.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const saveCard = async (imageBase64: string | null, file?: File) => {
    const tags = parseTags(tagsInput);
    setSaving(true);
    try {
      if (file) {
        await uploadCard(file, tags);
      } else if (imageBase64) {
        await saveCanvasCard(imageBase64, tags);
      } else {
        notifyError('Brak obrazu do zapisu');
        return;
      }
      notifySuccess('Karta zapisana');
      setPendingImage(null);
      setTagsInput('');
      await loadCards();
    } catch {
      notifyError('Nie udało się zapisać karty');
    } finally {
      setSaving(false);
    }
  };

  const onFile = (file: File | null) => {
    if (!file) return;
    if (!/^image\/(png|webp)$/i.test(file.type)) {
      notifyError('Akceptowane formaty: PNG, WebP');
      return;
    }
    void saveCard(null, file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    onFile(file ?? null);
  };

  return (
    <ViewPageShell
      maxWidth="lg"
      icon={<Palette className="text-orange-500" size={48} />}
      title="Moje karty"
      subtitle="Narysuj kartę lub wgraj plik PNG/WebP. Karty trafiają do Twojego zestawu użytkownika."
    >
      <div className="grid lg:grid-cols-2 gap-10">
        <div className="space-y-6">
          <CardCanvasEditor onExport={setPendingImage} />
          {pendingImage && (
            <div className="rounded-2xl border p-4 space-y-3 bg-white">
              <p className="text-sm font-medium text-gray-600">Podgląd do zapisu:</p>
              <img src={pendingImage} alt="Podgląd karty" className="max-h-48 mx-auto rounded-lg shadow" />
              <Button
                className="w-full"
                disabled={saving}
                onClick={() => void saveCard(pendingImage)}
              >
                {saving ? 'Zapisywanie…' : 'Zapisz rysunek'}
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Słowa kluczowe (oddziel przecinkami)
            </label>
            <Input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="np. morze, podróż, tajemnica"
            />
          </div>

          <div
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
              dragOver ? 'border-orange-400 bg-orange-50' : 'border-gray-200 bg-white/80'
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <ImagePlus className="mx-auto text-gray-400 mb-3" size={40} />
            <p className="font-medium text-gray-700 mb-4">Przeciągnij PNG lub WebP (max 2 MB)</p>
            <label className="inline-block">
              <input
                type="file"
                accept="image/png,image/webp"
                className="hidden"
                disabled={saving}
                onChange={(e) => onFile(e.target.files?.[0] ?? null)}
              />
              <span className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-gray-900 text-white font-bold cursor-pointer hover:bg-black">
                Wybierz plik
              </span>
            </label>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-black text-gray-900">Moje zapisane karty</h2>
            {loading && (
              <div className="flex justify-center py-8 text-orange-500">
                <Loader2 className="animate-spin" size={32} />
              </div>
            )}
            {!loading && cards.length === 0 && (
              <ApiStateMessage
                variant="empty"
                title="Brak kart"
                description="Narysuj lub wgraj pierwszą kartę — pojawi się tutaj."
              />
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {cards.map((card) => (
                <div
                  key={card.id}
                  className="rounded-xl overflow-hidden border bg-white shadow-sm"
                >
                  <img
                    src={card.image_url || `/api/cards/${card.id}/image`}
                    alt=""
                    className="w-full aspect-[2/3] object-cover"
                  />
                  {card.tags && card.tags.length > 0 && (
                    <p className="text-xs p-2 text-gray-500 truncate">
                      {(Array.isArray(card.tags) ? card.tags : []).join(', ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ViewPageShell>
  );
}
