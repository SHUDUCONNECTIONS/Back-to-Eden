import React, { useRef, useState } from 'react';
import { Plus, Trash2, Loader2, X, ImagePlus } from 'lucide-react';
import { CurrencyCode, UserProfile } from '../types';
import { formatPrice } from '../utils/currency';
import { createPost } from '../utils/communityApi';
import { formatBytes, prepareImage, PreparedImage } from '../utils/image';
import { useT } from '../i18n/useTranslation';

interface IngredientRow {
  name: string;
  amount: string;
  cost: string;
}

const emptyIngredient = (): IngredientRow => ({ name: '', amount: '', cost: '' });

interface PostComposerProps {
  user: UserProfile;
  currency: CurrencyCode;
  onPosted: () => void;
  onCancel: () => void;
}

/** Form for sharing a recipe with the community, shaped like the app's own recipes. */
export const PostComposer: React.FC<PostComposerProps> = ({
  user,
  currency,
  onPosted,
  onCancel,
}) => {
  const t = useT();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [servings, setServings] = useState(4);
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [ingredients, setIngredients] = useState<IngredientRow[]>([
    emptyIngredient(),
    emptyIngredient(),
  ]);
  const [steps, setSteps] = useState<string[]>(['', '']);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [photo, setPhoto] = useState<PreparedImage | null>(null);
  const [isPreparingPhoto, setIsPreparingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalCost = ingredients.reduce((sum, i) => sum + (Number(i.cost) || 0), 0);

  const choosePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Clear immediately so picking the same file twice still fires a change.
    e.target.value = '';
    if (!file) return;

    setError('');
    setIsPreparingPhoto(true);
    try {
      setPhoto(await prepareImage(file));
    } catch (err: any) {
      setError(err?.message || t('That image could not be used.'));
    } finally {
      setIsPreparingPhoto(false);
    }
  };

  const updateIngredient = (idx: number, patch: Partial<IngredientRow>) => {
    setIngredients((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSaving(true);

    try {
      await createPost(user, {
        title,
        description,
        servings,
        prepTime,
        cookTime,
        ingredients: ingredients
          .filter((i) => i.name.trim())
          .map((i) => ({
            name: i.name.trim(),
            amount: i.amount.trim(),
            costZar: Number(i.cost) || 0,
          })),
        steps: steps.map((s) => s.trim()).filter(Boolean),
        imageDataUrl: photo?.dataUrl,
      });
      onPosted();
    } catch (err: any) {
      setError(err?.message || t('Could not share that recipe.'));
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass =
    'w-full text-xs bg-[#fdfaf3] border border-[#ddd3ba] rounded-lg px-3 py-2 text-[#2f4026] focus:outline-none focus:ring-1 focus:ring-[#3e5531]';
  const labelClass = 'block text-[11px] font-bold text-[#4e6b3e] uppercase tracking-wider mb-1';

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-[#e9dfc8] rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs"
    >
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#f2e9d6]">
        <div>
          <h3 className="text-base font-bold text-[#2f4026]">{t('Share a recipe')}</h3>
          <p className="text-xs text-[#5a6b4f] mt-0.5">
            {t('Posting as')} <strong>{user.name}</strong>
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label={t('Close')}
          className="p-1.5 text-[#627f50] hover:text-[#2f4026] rounded-lg cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
          {error}
        </div>
      )}

      {/* Photo picker — the headline element of a feed post, so it comes first */}
      <div className="space-y-2">
        <span className={labelClass}>{t('Photo')}</span>

        {photo ? (
          <div className="relative rounded-xl overflow-hidden border border-[#ddd3ba] bg-[#f7eedd]">
            <img
              src={photo.dataUrl}
              alt={t('Your recipe photo')}
              className="w-full max-h-72 object-cover"
            />
            <button
              type="button"
              onClick={() => setPhoto(null)}
              aria-label={t('Remove photo')}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/55 text-white hover:bg-black/75 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="absolute bottom-2 left-2 text-[10px] font-medium text-white bg-black/55 px-2 py-0.5 rounded">
              {photo.width}×{photo.height} · {formatBytes(photo.bytes)}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isPreparingPhoto}
            className="w-full py-7 rounded-xl border-2 border-dashed border-[#ddd3ba] bg-[#fdfaf3] hover:bg-[#f7eedd] hover:border-[#c3b89c] transition-colors cursor-pointer flex flex-col items-center gap-1.5 text-[#5a6b4f]"
          >
            {isPreparingPhoto ? (
              <Loader2 className="w-6 h-6 animate-spin text-[#4e6b3e]" />
            ) : (
              <ImagePlus className="w-6 h-6 text-[#4e6b3e]" />
            )}
            <span className="text-xs font-semibold">
              {isPreparingPhoto ? t('Preparing photo…') : t('Add a photo of the dish')}
            </span>
            <span className="text-[10px] text-[#7b8370]">
              {t('Resized on your phone before upload')}
            </span>
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={choosePhoto}
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>

      <div className="space-y-3">
        <div>
          <label className={labelClass} htmlFor="post-title">
            {t('Recipe title')}
          </label>
          <input
            id="post-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('e.g. Samp and beans with tomato gravy')}
            maxLength={120}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="post-description">
            {t('Short description')}
          </label>
          <textarea
            id="post-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('What makes this worth cooking?')}
            maxLength={600}
            rows={2}
            className={`${inputClass} resize-y`}
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelClass} htmlFor="post-servings">
              {t('Serves')}
            </label>
            <input
              id="post-servings"
              type="number"
              min={1}
              max={50}
              value={servings}
              onChange={(e) => setServings(Number(e.target.value))}
              className={`${inputClass} font-numeric`}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="post-prep">
              {t('Prep time')}
            </label>
            <input
              id="post-prep"
              value={prepTime}
              onChange={(e) => setPrepTime(e.target.value)}
              placeholder={t('15 mins')}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="post-cook">
              {t('Cook time')}
            </label>
            <input
              id="post-cook"
              value={cookTime}
              onChange={(e) => setCookTime(e.target.value)}
              placeholder={t('40 mins')}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Ingredients */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className={labelClass}>{t('Ingredients')}</span>
          <span className="text-[11px] text-[#7b8370] font-numeric tabular-nums">
            {t('Total')}: {formatPrice(totalCost, currency)}
          </span>
        </div>

        <div className="space-y-2">
          {ingredients.map((row, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <input
                value={row.name}
                onChange={(e) => updateIngredient(idx, { name: e.target.value })}
                placeholder={t('Ingredient')}
                aria-label={`${t('Ingredient')} ${idx + 1}`}
                className={`${inputClass} flex-1`}
              />
              <input
                value={row.amount}
                onChange={(e) => updateIngredient(idx, { amount: e.target.value })}
                placeholder={t('Amount')}
                aria-label={`${t('Amount')} ${idx + 1}`}
                className={`${inputClass} w-24 sm:w-32`}
              />
              <div className="flex items-center bg-[#fdfaf3] border border-[#ddd3ba] rounded-lg px-2 w-20 shrink-0">
                <span className="text-[11px] text-[#6e8060]">R</span>
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  value={row.cost}
                  onChange={(e) => updateIngredient(idx, { cost: e.target.value })}
                  aria-label={`${t('Cost')} ${idx + 1}`}
                  className="w-full text-xs font-bold text-[#2f4026] font-numeric bg-transparent py-2 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => setIngredients((rows) => rows.filter((_, i) => i !== idx))}
                disabled={ingredients.length === 1}
                aria-label={t('Remove ingredient')}
                className="p-1.5 text-[#627f50] hover:text-rose-600 disabled:opacity-30 cursor-pointer shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setIngredients((rows) => [...rows, emptyIngredient()])}
          className="text-[11px] font-semibold text-[#4e6b3e] hover:text-[#2f4026] flex items-center gap-1 cursor-pointer"
        >
          <Plus className="w-3 h-3" /> {t('Add ingredient')}
        </button>
      </div>

      {/* Directions */}
      <div className="space-y-2">
        <span className={labelClass}>{t('Directions')}</span>
        <div className="space-y-2">
          {steps.map((step, idx) => (
            <div key={idx} className="flex gap-2 items-start">
              <span className="w-5 h-5 mt-2 rounded-full bg-[#eef3e3] border border-[#d4dfc6] text-[10px] font-bold text-[#4e6b3e] flex items-center justify-center shrink-0 font-numeric">
                {idx + 1}
              </span>
              <textarea
                value={step}
                onChange={(e) =>
                  setSteps((all) => all.map((s, i) => (i === idx ? e.target.value : s)))
                }
                placeholder={t('Describe this step')}
                aria-label={`${t('Step')} ${idx + 1}`}
                rows={2}
                maxLength={600}
                className={`${inputClass} resize-y`}
              />
              <button
                type="button"
                onClick={() => setSteps((all) => all.filter((_, i) => i !== idx))}
                disabled={steps.length === 1}
                aria-label={t('Remove step')}
                className="p-1.5 mt-1 text-[#627f50] hover:text-rose-600 disabled:opacity-30 cursor-pointer shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setSteps((all) => [...all, ''])}
          className="text-[11px] font-semibold text-[#4e6b3e] hover:text-[#2f4026] flex items-center gap-1 cursor-pointer"
        >
          <Plus className="w-3 h-3" /> {t('Add step')}
        </button>
      </div>

      <div className="flex items-center gap-2 pt-3 border-t border-[#f2e9d6]">
        <button
          type="submit"
          disabled={isSaving}
          className="px-4 py-2.5 text-xs font-bold text-white bg-[#4e6b3e] hover:bg-[#3e5531] disabled:opacity-50 rounded-xl transition-colors cursor-pointer flex items-center gap-2"
        >
          {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          <span>{isSaving ? t('Sharing…') : t('Share recipe')}</span>
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 text-xs font-semibold text-[#4e6b3e] hover:bg-[#eef3e3] rounded-xl transition-colors cursor-pointer"
        >
          {t('Cancel')}
        </button>
      </div>
    </form>
  );
};
