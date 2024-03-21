"use client";

import React, {
  useEffect,
  useState,
  useCallback,
  Dispatch,
  SetStateAction,
} from "react";

import * as echarts from "echarts";
// import { DatePicker } from "@tremor/react";
import { DatePicker } from "antd";
import { Col, Row } from "antd";

import locale from "antd/es/date-picker/locale/zh_CN";
import "dayjs/locale/zh-cn";
import dayjs from "dayjs";

import { EChartsOption } from "echarts";
import { essos } from "@/lib/charts_theme";
import { subDays, addDays } from "date-fns";

// import customParseFormat from 'dayjs/plugin/customParseFormat';
// dayjs.extend(customParseFormat);
// const dateFormat = 'YYYY-MM-DD';

interface ComponentProps {
  currentDate: Date;
  setCurrentDate: Dispatch<SetStateAction<Date>>;
}

const maxDate = new Date();

function DateSelectComponent({ currentDate, setCurrentDate }: ComponentProps) {
  const changeCurrentDate = useCallback(
    (d: Date) => {
      const new_d = new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        0,
        0,
        0,
      );
      if (new_d <= maxDate) {
        setCurrentDate(d);
      }
    },
    [setCurrentDate],
  );
  // 增加键盘监听修改日期
  useEffect(() => {
    const keydownEvent = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
          if (currentDate) {
            changeCurrentDate(subDays(currentDate, 1));
          }
          break;
        case "ArrowRight":
          if (currentDate) {
            changeCurrentDate(addDays(currentDate, 1));
          }
          break;
        default:
          break;
      }
    };
    document.addEventListener("keydown", keydownEvent);
    return () => {
      document.removeEventListener("keydown", keydownEvent);
    };
  }, [changeCurrentDate, currentDate]);

  return (
    <div className="max-w-sm mx-auto justify-center mb-1.5">
      <DatePicker
        value={dayjs(currentDate)}
        locale={locale}
        // defaultValue={dayjs(new Date())}
        onChange={(d, ds) => d && changeCurrentDate(d.toDate())}
        maxDate={dayjs(maxDate)}
      />
    </div>
  );
}

function EchartsComponent({ currentDate, setCurrentDate }: ComponentProps) {
  const [searchDate, setSearchDate] = useState("");

  useEffect(() => {
    let ignore = false;
    // console.log('windows', window.location.href)
    // console.log("init", currentDate, searchDate);
    const currentDateString = currentDate.toLocaleDateString();
    if (searchDate != currentDateString) {
      async function fetchData() {
        // console.log("异步", searchDate, currentDateString);
        const response = await fetch("/api/charts?date=" + currentDateString, {
          method: "GET",
        });
        // console.log('====', searchDate, currentDateString),
        const option: EChartsOption = await response.json();
        option["tooltip"] = {
          ...option["tooltip"],
          formatter: function (params) {
            if (!Array.isArray(params)) {
              return "";
            }
            //@ts-ignore
            let tooltipHtml = params[0].axisValue + "<br>";
            let sum: number = 0;
            for (let i = 0; i < params.length; i++) {
              if (params[i].value) {
                tooltipHtml +=
                  (params[i].marker ?? "") +
                  (params[i].seriesName ?? "") +
                  ": " +
                  params[i].value +
                  "<br>";
                //@ts-ignore
                sum += params[i].value;
              }
            }
            tooltipHtml += "总和: " + sum;
            return tooltipHtml;
          },
        };
        return option;
      }
      fetchData().then((option) => {
        if (!ignore && option && typeof window !== "undefined") {
          let chartDom = document.getElementById("usage-by-model-chart");
          echarts.registerTheme("default", essos);
          let myChart = echarts.init(chartDom, "default");
          option && myChart.setOption(option);
          setSearchDate(currentDateString);
          // console.log("option计数", 1);
        }
      });
      // console.log("搜索开始计数", 1, searchDate, currentDateString);
    }
    return () => {
      ignore = true;
    };
  }, [currentDate, searchDate]); // 空数组作为第二个参数，表示仅在组件挂载和卸载时执行

  return (
    <div
      id="usage-by-model-chart"
      style={{ width: "100%", height: "400px" }}
    ></div>
  );
}

export default function UsageByModelChart() {
  const [currentDate, setCurrentDate] = useState(new Date());

  return (
    <div>
      <Row>
        <DateSelectComponent
          currentDate={currentDate}
          setCurrentDate={setCurrentDate}
        />
      </Row>
      <Row>
        <EchartsComponent
          currentDate={currentDate}
          setCurrentDate={setCurrentDate}
        />
      </Row>
    </div>
  );
}
