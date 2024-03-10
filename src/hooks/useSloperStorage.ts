import { useLocalStorage } from "usehooks-ts";
import { SavedSloper } from "../measurements";

// we store an array of slopers in local storage
export const useSloperStorage = () => {
  const [storedSlopers, setStoredSlopers] = useLocalStorage<SavedSloper[]>(
    "sloper",
    []
  );

  const updateOrAddSloper = (sloper: SavedSloper) => {
    const index = storedSlopers.findIndex((s) => s.slug === sloper.slug);
    if (index === -1) {
      setStoredSlopers([...storedSlopers, sloper]);
      return;
    }
    const updatedSlopers = [...storedSlopers];
    updatedSlopers[index] = sloper;
    setStoredSlopers(updatedSlopers);
  };

  return { storedSlopers, updateOrAddSloper };
};
