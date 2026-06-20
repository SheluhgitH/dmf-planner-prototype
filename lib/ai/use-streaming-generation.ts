"use client";

import { useCallback, useRef, useState } from "react";

export function useStreamingGeneration() {
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  const reset = useCallback(() => {
    setOutput("");
    setError(null);
    abortRef.current = false;
  }, []);

  const runStream = useCallback(
    async (generator: AsyncGenerator<string>) => {
      setLoading(true);
      setError(null);
      setOutput("");
      abortRef.current = false;
      try {
        for await (const chunk of generator) {
          if (abortRef.current) break;
          setOutput((prev) => prev + chunk);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Generation failed");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const cancel = useCallback(() => {
    abortRef.current = true;
    setLoading(false);
  }, []);

  return { output, setOutput, loading, error, reset, runStream, cancel };
}
